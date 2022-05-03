/// <reference types="@vechain/connex-types">

'use strict';

import {
	ConnexTxObj,
	ConvertedFilterOpts
} from './types';
import { hexToNumber, getErrMsg, toEip1193SubResp, toHex } from './utils';
import { Err } from './error';
import { Formatter } from './formatter';
import { Transaction, keccak256 } from 'thor-devkit';
import EventEmitter from 'eventemitter3';
import { RequestArguments } from 'web3-core';
import { Net, Wallet } from '@vechain/connex-driver';
import { Restful } from './restful';

type MethodHandler = (params: any[]) => Promise<any>;
type DelegateOpt = {
	url: string;
	payer?: string;
}

export class ConnexProvider extends EventEmitter {
	readonly connex: Connex;
	readonly chainTag: number;
	readonly restful?: Restful;
	readonly wallet?: Wallet;

	private readonly _formatter: Formatter;
	private readonly _methodMap: Record<string, MethodHandler> = {};
	private _subscriptions: Record<'newHeads' | 'logs', Record<string, any[]>> = {
		newHeads: {},
		logs: {},
	};

	private _delegate: DelegateOpt | null;

	constructor(opt: {
		connex: Connex,
		wallet?: Wallet,
		net?: Net,
		ifReturnThorObj?: boolean,
		delegate?: DelegateOpt,
	}) {
		super();

		this.connex = opt.connex;
		const id = opt.connex.thor.genesis.id;
		this.chainTag = hexToNumber('0x' + id.substring(id.length - 2));

		this._formatter = new Formatter(opt.connex, !!opt.net, !!opt.ifReturnThorObj);
		this._delegate = opt.delegate || null;

		this._methodMap['eth_getBlockByHash'] = this._getBlockByHash;
		this._methodMap['eth_getBlockByNumber'] = this._getBlockByNumber;
		this._methodMap['eth_chainId'] = this._getChainId;
		this._methodMap['eth_getTransactionByHash'] = this._getTransactionByHash;
		this._methodMap['eth_getBalance'] = this._getBalance;
		this._methodMap['eth_blockNumber'] = this._getBlockNumber;
		this._methodMap['eth_getCode'] = this._getCode;
		this._methodMap['eth_syncing'] = this._isSyncing;
		this._methodMap['eth_getTransactionReceipt'] = this._getTransactionReceipt;
		this._methodMap['eth_getStorageAt'] = this._getStorageAt;
		this._methodMap['eth_sendTransaction'] = this._sendTransaction;
		this._methodMap['eth_call'] = this._call;
		this._methodMap['eth_estimateGas'] = this._estimateGas;
		this._methodMap['eth_getLogs'] = this._getLogs;

		this._methodMap['eth_subscribe'] = this._subscribe;
		this._methodMap['eth_unsubscribe'] = this._unsubscribe;

		if (opt.net) {
			this.restful = new Restful(opt.net, this.connex.thor.genesis.id);
			this._methodMap['eth_sendRawTransaction'] = this._sendRawTransaction;
		}

		if (opt.wallet) {
			this.wallet = opt.wallet,
				this._methodMap['eth_accounts'] = this._accounts;
		}

		// dummy
		this._methodMap['eth_gasPrice'] = async () => { return '0x0'; };
		this._methodMap['eth_getTransactionCount'] = async () => { return '0x0'; };
		this._methodMap['net_version'] = async () => { return '0x0'; };

		this._subLoop();

		// Thor methods
		this._methodMap['thor_next'] = this._next;
	}

	enableDelegate = (opt: DelegateOpt) => {
		this._delegate = opt;
	}

	disableDelegate = () => {
		this._delegate = null;
	}

	request = async (req: RequestArguments) => {
		const exec = this._methodMap[req.method];
		if (!exec) {
			return Promise.reject(Err.MethodNotFound(req.method));
		}

		const paramsOrErr = this._formatter.formatInput({
			id: req.id,
			method: req.method,
			params: req.params || [],
		})

		if (paramsOrErr instanceof Error) {
			return Promise.reject(paramsOrErr);
		}

		return exec(paramsOrErr);
	}

	private _next = async (params: any) => {
		const ticker = this.connex.thor.ticker();
		await ticker.next();
		return true;
	}

	private _accounts = async (params: any) => {
		if (!this.wallet) {
			return [];
		}

		return this.wallet.list.map(key => key.address);
	}

	private _sendRawTransaction = async (params: any[]) => {
		try {
			if (this.restful) {
				return this.restful.sendRawTransaction(params[0]);
			}
			return null;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _subscribe = async (params: any[]) => {
		const subId = this._getSubscriptionId(params);
		const subName: 'newHeads' | 'logs' = params[0];

		if (this._subscriptions[subName][subId]) {
			return Promise.reject(Err.SubscriptionAlreadyExist(subId));
		}

		this._subscriptions[subName][subId] = params[1] || {};

		return subId;
	}

	private _unsubscribe = async (params: any[]) => {
		const subId: string = params[0];

		if (!this._subscriptions['newHeads'][subId] && !this._subscriptions['logs'][subId]) {
			return Promise.reject(Err.SubscriptionIdNotFound);
		}

		this._subscriptions['newHeads'][subId] ?
			delete this._subscriptions['newHeads'][subId] :
			delete this._subscriptions['logs'][subId];

		return true;
	}

	private _subLoop: () => void = async () => {
		const ticker = this.connex.thor.ticker();

		try {
			for (; ;) {
				const best = await ticker.next();

				const newHeadsKeys = Object.keys(this._subscriptions['newHeads']);
				if (newHeadsKeys.length > 0) {
					(async () => {
						try {
							const blk = await this.connex.thor.block().get();
							if (blk) {
								newHeadsKeys.forEach(key => {
									this.emit('message', toEip1193SubResp(
										this._formatter.outputHeaderFormatter(blk), key
									));
								})
							}
						} catch { }
					})();
				}

				const logsKeys = Object.keys(this._subscriptions['logs']);
				if (logsKeys.length > 0) {
					logsKeys.forEach(async (key) => {
						const MAX_LIMIT = 256;
						const range: Connex.Thor.Filter.Range = {
							unit: 'block',
							from: best.number,
							to: best.number,
						}
						try {
							const ret = await this.connex.thor.filter('event', this._subscriptions['logs'][key])
								.range(range)
								.apply(0, MAX_LIMIT);

							if (ret) {
								this.emit('message', toEip1193SubResp(
									this._formatter.outputLogsFormatter(ret), key
								));
							}
						} catch { }
					});
				}
			}
		} catch (err: any) {
			throw new Error(err);
		}
	}

	private _getSubscriptionId = (params: any[]) => {
		return '0x' + keccak256((new Date()).getTime().toString(), JSON.stringify(params)).toString('hex');
	}

	private _getLogs = async (params: any[]) => {
		const MAX_LIMIT = 256;
		const opts: ConvertedFilterOpts = params[0];
		try {
			const ret = await this.connex.thor.filter('event', opts.criteria)
				.range(opts.range)
				.apply(0, MAX_LIMIT);
			return this._formatter.outputLogsFormatter(ret);
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _estimateGas = async (params: any[]) => {
		const txObj: ConnexTxObj = params[0];
		let explainer = this.connex.thor.explain([txObj.clauses[0]]);
		if (txObj.from) { explainer = explainer.caller(txObj.from); }
		if (txObj.gas) { explainer = explainer.gas(txObj.gas); }
		try {
			const outputs = await explainer.execute();

			const output = outputs[0];
			if (output.reverted) {
				return Promise.reject({
					data: getErrMsg(output),
					message: output?.revertReason || output.vmError
				});
			}

			const clause: Transaction.Clause = {
				to: txObj.clauses[0].to,
				value: txObj.clauses[0].value,
				data: txObj.clauses[0].data ? txObj.clauses[0].data : '0x',
			};

			const execGas = outputs.reduce((sum, out) => sum + out.gasUsed, 0);
			const intrinsicGas = Transaction.intrinsicGas([clause]);
			const estimatedGas = intrinsicGas + (execGas ? (execGas + 15000) : 0);

			return toHex(estimatedGas);
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _call = async (params: any[]) => {
		const txObj: ConnexTxObj = params[0];
		try {
			if (this.restful) {
				const callObj: Connex.Driver.ExplainArg = {
					clauses: txObj.clauses.map(c => {
						return {
							to: c.to,
							value: toHex(c.value),
							data: c.data || '0x'
						}
					})
				}
				if (txObj.gas) { callObj.gas = txObj.gas; }
				if (txObj.from) { callObj.caller = txObj.from; }

				return this.restful.call(callObj, params[1]);
			}

			let explainer = this.connex.thor.explain([txObj.clauses[0]]);
			if (txObj.from) { explainer = explainer.caller(txObj.from); }
			if (txObj.gas) { explainer = explainer.gas(txObj.gas); }

			const outputs = await explainer.execute();
			const output = outputs[0];
			if (output.reverted) {
				return Promise.reject({
					data: getErrMsg(output),
					message: output?.revertReason || output.vmError
				});
			}
			return output.data;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _sendTransaction = async (params: any[]) => {
		const txObj: ConnexTxObj = params[0];
		let ss = this.connex.vendor.sign('tx', [txObj.clauses[0]]);
		if (txObj.from) { ss = ss.signer(txObj.from); }
		if (this._delegate) {
			if (!this._delegate.payer) {
				ss = ss.delegate(this._delegate.url);
			} else {
				ss = ss.delegate(this._delegate.url, this._delegate.payer);
			}
		}
		if (txObj.gas) { ss = ss.gas(txObj.gas); }
		
		try {
			const ret = await ss.request()
			return ret.txid;
		} catch (err: any) {
			return Promise.reject(err);
		};
	}

	private _getStorageAt = async (params: any[]) => {
		try {
			if (this.restful) {
				return this.restful.getStorageAt(params[0], params[1], params[2]);
			}
			const storage = await this.connex.thor.account(params[0]).getStorage(params[1]);
			return storage.value;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getTransactionReceipt = async (params: any[]) => {
		const hash: string = params[0];
		try {
			const receipt = await this.connex.thor.transaction(hash).getReceipt();
			if (!receipt) {
				return null;
			} else {
				return this._formatter.outputReceiptFormatter(receipt);
			}
		} catch (err: any) {
			return Promise.reject(err);
		};
	}

	private _isSyncing = async (params: any[]) => {
		try {
			await this.connex.thor.ticker().next()
			if (this.connex.thor.status.progress == 1) {
				return false;
			} else {
				const highestBlock = Math.floor(
					(Date.now() - this.connex.thor.genesis.timestamp) / 10000
				);
				return {
					startingBlock: null,
					currentBlock: toHex(this.connex.thor.status.head.number),
					highestBlock: toHex(highestBlock),
					//thor: this.connex.thor.status,
				};
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getCode = async (params: any[]) => {
		try {
			if (this.restful) {
				return this.restful.getCode(params[0], params[1]);
			}
			const code = await this.connex.thor.account(params[0]).getCode();
			return code.code;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getBlockNumber = async (params: any[]) => {
		try {
			const blk = await this.connex.thor.block().get()
			if (!blk) {
				return null;
			} else {
				return toHex(blk.number);
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getBalance = async (params: any[]) => {
		try {
			if (this.restful) {
				return this.restful.getBalance(params[0], params[1]);
			}
			const acc = await this.connex.thor.account(params[0]).get();
			return acc.balance;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getTransactionByHash = async (params: any[]) => {
		const hash: string = params[0];
		try {
			const tx = await this.connex.thor.transaction(hash).get();
			if (!tx) {
				return null;
			} else {
				return this._formatter.outputTransactionFormatter(tx);
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getChainId = async (params: any[]) => {
		return toHex(this.chainTag);
	}

	private _getBlockByNumber = async (params: any[]) => {
		const num = params[0];
		try {
			const blk = await this.connex.thor.block(num).get();
			if (!blk) {
				return null; //Promise.reject(Err.BlockNotFound(num ? (num == 0 ? 'earliest' : num) : 'latest'));
			} else {
				return this._formatter.outputBlockFormatter(blk);
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getBlockByHash = async (params: any[]) => {
		const hash: string = params[0];
		try {
			const blk = await this.connex.thor.block(hash).get();
			if (!blk) {
				return null;
			} else {
				return this._formatter.outputBlockFormatter(blk);
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}
}