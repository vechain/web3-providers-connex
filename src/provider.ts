/// <reference types="@vechain/connex-types">

'use strict';

import {
	ConnexTxObj,
	ConvertedFilterOpts
} from './types';
import { hexToNumber, getErrMsg, toEip1193SubResp } from './utils';
import { Err } from './error';
import { Formatter } from './formatter';
import { Transaction, keccak256 } from 'thor-devkit';
import EventEmitter from 'eventemitter3';
import { RequestArguments } from 'web3-core';
import { Net, Wallet } from '@vechain/connex-driver';

type MethodHandler = (params: any[]) => Promise<any>;

export class ConnexProvider extends EventEmitter {
	readonly connex: Connex;
	readonly chainTag: number;
	readonly net?: Net;
	readonly wallet?: Wallet;

	private readonly _formatter: Formatter;
	private readonly _methodMap: Record<string, MethodHandler> = {};
	private _subscriptions: Record<'newHeads' | 'logs', Record<string, any[]>> = {
		newHeads: {},
		logs: {},
	};

	constructor(opt: { connex: Connex, wallet?: Wallet, net?: Net }) {
		super();

		this.connex = opt.connex;
		const id = opt.connex.thor.genesis.id;
		this.chainTag = hexToNumber('0x' + id.substring(id.length - 2));

		this._formatter = new Formatter(opt.connex);

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
			this.net = opt.net;
			this._methodMap['eth_sendRawTransaction'] = this._sendRawTransaction;
		}

		if (opt.wallet) {
			this.wallet = opt.wallet,
				this._methodMap['eth_accounts'] = this._accounts;
		}

		// dummy
		this._methodMap['eth_gasPrice'] = this._gasPrice;

		// console.log('Start subloop');
		this._subLoop();

		// Thor methods
		this._methodMap['thor_next'] = this._next;
	}

	public async request(req: RequestArguments) {
		const exec = this._methodMap[req.method];
		if (!exec) {
			return Promise.reject(Err.MethodNotFound(req.method));
		}

		// let paramsOrErr: any[] | Error = req.params || [];
		// if (InputFormatter[req.method]) {
		// 	paramsOrErr = InputFormatter[req.method]({
		// 		id: req['id'],
		// 		method: req.method,
		// 		params: req.params || []
		// 	});
		// }
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

	private get _headerValidator() {
		return (headers: Record<string, string>) => {
			const xgid = headers['x-genesis-id']
			if (xgid && xgid !== this.connex.thor.genesis.id) {
				throw new Error(`responded 'x-genesis-id' not matched`)
			}
		}
	}

	private _sendRawTransaction = async (params: any[]) => {
		try {
			const resp = await this.net!.http(
				"POST",
				"transactions",
				{
					body: { raw: params[0] },
					validateResponseHeader: this._headerValidator
				}
			);
			if (!resp.id) { return Promise.reject(`Invalid http response: ${resp}`); }
			return resp.id;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _subscribe = async (params: any[]) => {
		const subId = this._getSubscriptionId(params);
		const subName: string = params[0];

		if (subName !== 'newHeads' && subName !== 'logs') {
			return Promise.reject(Err.InvalidSubscriptionName(subName));
		}

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
				return Promise.reject({ data: getErrMsg(output) });
			}

			const clause: Transaction.Clause = {
				to: txObj.clauses[0].to,
				value: txObj.clauses[0].value,
				data: txObj.clauses[0].data ? txObj.clauses[0].data : '0x',
			};

			const execGas = outputs.reduce((sum, out) => sum + out.gasUsed, 0);
			const intrinsicGas = Transaction.intrinsicGas([clause]);
			const estimatedGas = intrinsicGas + (execGas ? (execGas + 15000) : 0);

			return estimatedGas;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _call = async (params: any[]) => {
		const txObj: ConnexTxObj = params[0];
		let explainer = this.connex.thor.explain([txObj.clauses[0]]);
		if (txObj.from) { explainer = explainer.caller(txObj.from); }
		if (txObj.gas) { explainer = explainer.gas(txObj.gas); }
		try {
			const outputs = await explainer.execute();
			const output = outputs[0];
			if (output.reverted) {
				return Promise.reject({ data: getErrMsg(output) });
			}
			return output.data;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _gasPrice = async (params: any[]) => {
		return 0;
	}

	private _sendTransaction = async (params: any[]) => {
		const txObj: ConnexTxObj = params[0];
		let ss = this.connex.vendor.sign('tx', [txObj.clauses[0]]);
		if (txObj.from) { ss = ss.signer(txObj.from); }
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
					currentBlock: this.connex.thor.status.head.number,
					highestBlock: highestBlock,
					thor: this.connex.thor.status,
				};
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getCode = async (params: any[]) => {
		try {
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
				return null; //Promise.reject(Err.BlockNotFound('latest'));
			} else {
				return blk.number;
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getBalance = async (params: any[]) => {
		try {
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
				return null; //Promise.reject(Err.TransactionNotFound(hash));
			} else {
				return this._formatter.outputTransactionFormatter(tx);
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	private _getChainId = async (params: any[]) => {
		return this.chainTag;
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
				return null; //Promise.reject(Err.BlockNotFound(hash));
			} else {
				return this._formatter.outputBlockFormatter(blk);
			}
		} catch (err: any) {
			return Promise.reject(err);
		}
	}
}