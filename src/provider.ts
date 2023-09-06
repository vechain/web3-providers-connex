/// <reference types='@vechain/connex-types'/>

'use strict';

import { ConvertedFilterOpts, Net, Wallet, ExplainArg, DelegateOpt } from './types';
import { hexToNumber, getErrMsg, toSubscription, toHex } from './utils';
import { ErrMsg, ErrCode } from './error';
import { Formatter } from './formatter';
import { Transaction, keccak256 } from 'thor-devkit';
import EventEmitter from 'eventemitter3';
import { Restful } from './restful';
import { IProvider, ProviderRpcError, RequestArguments } from './eip1193';
import { EthJsonRpcMethods } from './common';
import { numberToHex } from 'web3-utils';

type MethodHandler = (params: any[]) => Promise<any>;

export class Provider extends EventEmitter implements IProvider {
	readonly connex: Connex;
	readonly chainTag: number;
	readonly chainId: string;
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
		delegate?: DelegateOpt,
	}) {
		super();

		this.connex = opt.connex;
		const id = opt.connex.thor.genesis.id;
		this.chainTag = hexToNumber('0x' + id.substring(id.length - 2));
		this.chainId = id;
		this._formatter = new Formatter(opt.connex, !!opt.net);
		this._delegate = opt.delegate ? opt.delegate : null;

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
		this._methodMap['eth_accounts'] = this._accounts;
		this._methodMap['net_version'] = this._getChainId;

		this._methodMap['eth_requestAccounts'] = this._requestAccounts;

		if (opt.net) {
			this.restful = new Restful(opt.net, this.connex.thor.genesis.id);
			this._methodMap['eth_sendRawTransaction'] = this._sendRawTransaction;
			this._methodMap['debug_traceTransaction'] = this._traceTransaction;
			this._methodMap['debug_traceCall'] = this._traceCall;
		}

		if (opt.wallet) {
			this.wallet = opt.wallet
		}

		this._methodMap['web3_clientVersion'] = async () => { return "thor"; };

		// dummy
		this._methodMap['eth_gasPrice'] = async () => { return '0x0'; };
		this._methodMap['eth_getTransactionCount'] = async () => { return '0x0'; };

		this._subLoop();

		// Ganache methods
		this._methodMap['evm_mine'] = this._mine;
	}

	enableDelegate(opt: DelegateOpt): DelegateOpt | null {
		const old = this._delegate;
		this._delegate = opt;
		return old;
	}

	disableDelegate(): DelegateOpt | null {
		const opt = this._delegate;
		this._delegate = null;
		return opt;
	}

	async request(req: RequestArguments): Promise<any> {
		if (!EthJsonRpcMethods.includes(req.method)) {
			const msg = `Method ${req.method} not found`;
			return Promise.reject(new ProviderRpcError(ErrCode.MethodNotFound, msg));
		}

		const exec = this._methodMap[req.method];
		if (!exec) {
			const msg = `Method ${req.method} not implemented`;
			return Promise.reject(new ProviderRpcError(ErrCode.MethodNotFound, msg));
		}

		let params: any[];
		try {
			params = this._formatter.formatInput(req.method, req.params);
		} catch (err: any) {
			return Promise.reject(err);
		}

		return exec(params);
	}

	private _requestAccounts = async () => {
		if (!this.wallet || this.wallet.list.length === 0) {
			return Promise.reject(new ProviderRpcError(ErrCode.Default, 'No account'));
		}

		const addrs = this.wallet.list.map(key => key.address);
		return addrs;
	}

	private _getTransactionIndex = async (blkId: string, txId: string): Promise<number> => {
		const blk = await this.connex.thor.block(blkId).get();
		if (!blk) { return Promise.reject(new Error(`Block ${blkId} not found`)); }

		const txIndex = blk.transactions.findIndex(elem => elem == txId);
		if (txIndex == -1) { return Promise.reject(new Error(`Tx ${txId} not found in block`)); }

		return txIndex;
	}

	private _getNumOfLogsAhead = async (blkId: string, txId: string): Promise<number> => {
		const blk = await this.connex.thor.block(blkId).get();
		if (!blk) { return Promise.reject(new Error(`Block ${blkId} not found`)); }

		const txInd = await this._getTransactionIndex(blkId, txId);

		// Count the number of logs in the txs whose number is lower than txId
		let logInd = 0;
		for (let i = 0; i < txInd; i++) {
			const txId = blk.transactions[i];
			const receipt = await this.connex.thor.transaction(txId).getReceipt();
			if (!receipt) { return Promise.reject(new Error(`Receipt of Tx ${txId} not found`)); }
			receipt.outputs.forEach(output => {
				logInd += output.events.length;
			})
		}

		return logInd;
	}

	private _getLogIndexWithinTx = async (log: Connex.Thor.Filter.Row<'event'>): Promise<number> => {
		const receipt = await this.connex.thor.transaction(log.meta.txID).getReceipt();
		if (!receipt) { return Promise.reject(new Error(`Receipt of Tx ${log.meta.txID}} not found`)); }

		let offset = 0
		for (let output of receipt.outputs) {
			const events = output.events;
			for (let i = 0; i < events.length; i++) {
				const ev = events[i];
				if (log.address !== ev.address
					|| log.topics.length !== ev.topics.length
					|| log.data !== ev.data) { continue; }

				for (let j = 0; j < log.topics.length; j++) {
					if (log.topics[j] !== ev.topics[j]) { continue; }
				}

				return i + offset
			}
			offset += events.length
		}

		return Promise.reject(new Error('Log not found'));
	}

	private _mine = async (_: any) => {
		await this.connex.thor.ticker().next();
	}

	private _accounts = async (_: any) => {
		if (!this.wallet || this.wallet.list.length === 0) {
			return [];
		}

		const addrs = this.wallet.list.map(key => key.address);
		return addrs;
	}

	private _sendRawTransaction = async (params: any[]) => {
		try {
			if (this.restful) {
				return await this.restful.sendRawTransaction(params[0]);
			}
		} catch (err: any) {
			if (err instanceof ProviderRpcError) {
				return Promise.reject(err);
			}
			return Promise.reject(new ProviderRpcError(ErrCode.Default, getErrMsg(err)));
		}

		return Promise.reject(new ProviderRpcError(ErrCode.Default, 'Restful API not supported'));
	}

	private _subscribe = async (params: any[]) => {
		const subId = this._getSubscriptionId(params);
		const subName: 'newHeads' | 'logs' = params[0];

		this._subscriptions[subName][subId] = params[1] || {};

		return subId;
	}

	private _unsubscribe = async (params: any[]) => {
		const subId: string = params[0];

		if (!this._subscriptions['newHeads'][subId] && !this._subscriptions['logs'][subId]) {
			return Promise.reject(
				new ProviderRpcError(ErrCode.InternalError, ErrMsg.SubscriptionIdNotFound(subId))
			);
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
					const blk = await this.connex.thor.block().get();
					if (blk) {
						newHeadsKeys.forEach(key => {
							this.emit('message', toSubscription(
								this._formatter.outputHeaderFormatter(blk), key
							));
						})
					}
				}

				const logsKeys = Object.keys(this._subscriptions['logs']);
				if (logsKeys.length > 0) {
					await Promise.all(logsKeys.map(async (key) => {
						const MAX_LIMIT = 256;
						const range: Connex.Thor.Filter.Range = {
							unit: 'block',
							from: best.number,
							to: best.number,
						}

						let logs = await this.connex.thor.filter('event', this._subscriptions['logs'][key])
							.range(range)
							.apply(0, MAX_LIMIT);

						if (logs) {
							const txInds: string[] = [];
							const logInds: string[] = [];
							for (let i = 0; i < logs.length; i++) {
								const log = logs[i];
								const offset = await this._getNumOfLogsAhead(log.meta.blockID, log.meta.txID);
								const ind = await this._getLogIndexWithinTx(log);
								logInds[i] = numberToHex(offset + ind);
								txInds[i] = numberToHex(
									await this._getTransactionIndex(log.meta.blockID, log.meta.txID)
								);
							};

							this.emit('message', toSubscription(
								this._formatter.outputLogsFormatter({ logs: logs, txInds: txInds, logInds: logInds }),
								key
							));
						}
					}));
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
			let logs = await this.connex.thor.filter('event', opts.criteria)
				.range(opts.range)
				.apply(0, MAX_LIMIT);

			if (logs.length === 0) {
				return [];
			}

			const txInds: string[] = [];
			const logInds: string[] = [];
			for (let i = 0; i < logs.length; i++) {
				const log = logs[i];
				const offset = await this._getNumOfLogsAhead(log.meta.blockID, log.meta.txID);
				const ind = await this._getLogIndexWithinTx(log);
				logInds[i] = numberToHex(offset + ind);
				txInds[i] = numberToHex(
					await this._getTransactionIndex(log.meta.blockID, log.meta.txID)
				);
			}

			return this._formatter.outputLogsFormatter({ logs: logs, txInds: txInds, logInds: logInds });
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _estimateGas = async (params: any[]) => {
		const txObj: ExplainArg = params[0];
		let explainer = this.connex.thor.explain([txObj.clauses[0]]);
		if (txObj.caller) { explainer = explainer.caller(txObj.caller); }
		if (txObj.gas) { explainer = explainer.gas(txObj.gas); }
		try {
			const outputs = await explainer.execute();

			const output = outputs[0];
			if (output.reverted) {
				if (output.vmError === 'execution reverted' && output.revertReason) {
					return Promise.reject(new ProviderRpcError(
						ErrCode.InternalError,
						`execution reverted: ${output.revertReason}`,
						output.data,
					))
				} else {
					return Promise.reject(new ProviderRpcError(ErrCode.Default, output.vmError))
				}
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
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _call = async (params: any[]) => {
		const txObj: ExplainArg = params[0];
		try {
			if (this.restful) {
				return await this.restful.call(txObj, params[1]);
			}

			let explainer = this.connex.thor.explain([txObj.clauses[0]]);
			if (txObj.caller) { explainer = explainer.caller(txObj.caller); }
			if (txObj.gas) { explainer = explainer.gas(txObj.gas); }

			const outputs = await explainer.execute();
			const output = outputs[0];
			if (output.reverted) {
				if (output.vmError === 'execution reverted' && output.revertReason) {
					return Promise.reject(new ProviderRpcError(
						ErrCode.InternalError,
						`execution reverted: ${output.revertReason}`,
						output.data,
					))
				} else {
					return Promise.reject(new ProviderRpcError(ErrCode.Default, output.vmError))
				}
			}
			return output.data;
		} catch (err: any) {
			if (err instanceof ProviderRpcError) {
				return Promise.reject(err);
			}
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _sendTransaction = async (params: any[]) => {
		const txObj: ExplainArg = params[0];
		let ss = this.connex.vendor.sign('tx', [txObj.clauses[0]]);
		if (txObj.caller) { ss = ss.signer(txObj.caller); }
		if (this._delegate) {
			if (this._delegate.signer) {
				ss = ss.delegate(this._delegate.url, this._delegate.signer);
			} else {
				ss = ss.delegate(this._delegate.url);
			}
		}
		if (txObj.gas) { ss = ss.gas(txObj.gas); }

		try {
			const ret = await ss.request()
			return ret.txid;
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.Default, getErrMsg(err)));
		}
	}

	private _getStorageAt = async (params: any[]) => {
		const [addr, key, revision] = params

		try {
			if (this.restful) {
				return await this.restful.getStorageAt(addr, key, revision);
			}
			const storage = await this.connex.thor.account(addr).getStorage(key);
			return storage.value;
		} catch (err: any) {
			if (err instanceof ProviderRpcError) {
				return Promise.reject(err);
			}
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _getTransactionReceipt = async (params: any[]) => {
		const hash: string = params[0];
		try {
			const receipt = await this.connex.thor.transaction(hash).getReceipt();
			if (!receipt) {
				return null;
			} else {
				const blkId = receipt.meta.blockID;
				const blk = await this.connex.thor.block(blkId).get();
				if (!blk) { return Promise.reject(new ProviderRpcError(ErrCode.Default, 'Block not found')); }

				const tx = await this.connex.thor.transaction(hash).get();
				if (!tx) { return Promise.reject(new ProviderRpcError(ErrCode.Default, 'Tx not found')); }

				const txInd = numberToHex(await this._getTransactionIndex(blkId, hash));
				const logIndOffset = await this._getNumOfLogsAhead(blkId, hash);
				const n = receipt.outputs[0]?.events.length || 0;
				const logInds = new Array<number>(n)
					.fill(logIndOffset)
					.map((_, i) => { return numberToHex(logIndOffset + i); });

				return this._formatter.outputReceiptFormatter(
					{
						...receipt, ...{
							transactionIndex: txInd,
							logInds: logInds,
							from: tx.origin,
							to: tx.clauses[0].to
						},
					}
				);
			}
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		};
	}

	private _isSyncing = async (_: any[]) => {
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
				};
			}
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _getCode = async (params: any[]) => {
		const [addr, revision] = params

		try {
			if (this.restful) {
				return await this.restful.getCode(addr, revision);
			}
			const code = await this.connex.thor.account(addr).getCode();
			return code.code;
		} catch (err: any) {
			if (err instanceof ProviderRpcError) {
				return Promise.reject(err);
			}
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _getBlockNumber = async (_: any[]) => {
		try {
			const blk = await this.connex.thor.block().get()
			if (!blk) {
				return null;
			} else {
				return toHex(blk.number);
			}
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _getBalance = async (params: any[]) => {
		const [addr, revision] = params;

		try {
			if (this.restful) {
				return await this.restful.getBalance(addr, revision);
			}
			const acc = await this.connex.thor.account(addr).get();
			return acc.balance;
		} catch (err: any) {
			if (err instanceof ProviderRpcError) {
				return Promise.reject(err);
			}
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _getTransactionByHash = async (params: any[]) => {
		const hash: string = params[0];
		try {
			const tx = await this.connex.thor.transaction(hash).get();
			if (!tx) {
				return null;
			} else {
				const ind = numberToHex(await this._getTransactionIndex(tx.meta.blockID, hash));
				return this._formatter.outputTransactionFormatter({ ...tx, ...{ transactionIndex: ind } });
			}
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _getChainId = async (_: any[]) => {
		const bigIntValue = BigInt(this.chainId);
		return bigIntValue;
	}

	private _getBlockByNumber = async (params: any[]) => {
		const num: number = params[0];
		try {
			const blk = await this.connex.thor.block(num).get();
			if (!blk) {
				return null;
			} else {
				return this._formatter.outputBlockFormatter(blk);
			}
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
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
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _traceTransaction = async (params: any[]) => {
		/**
		 * debug_traceTransaction(txHash, traceOptions)
		 * traceOptions: {
		 * 	tracer: '', // name of tracer or custom js tracer code
		 * 	config: {}  // struct logger config object
		 * 	tracerConfig: {} // tracer specific config object
		 * }
		 */
		if(!this.restful) {
			return Promise.reject(new ProviderRpcError(ErrCode.Default, 'Restful API not supported'));
		}

		try {
			const txId = params[0]
			const opts = params[1]
			const tx = await this.connex.thor.transaction(txId).get();
			if (!tx) { return Promise.reject(new ProviderRpcError(ErrCode.Default, 'Target not found')); }

			const blk = (await this.connex.thor.block(tx.meta.blockID).get())!;
			const txIndex = blk.transactions.findIndex(elem => elem == txId);


			if (opts?.tracer) {
				return await this.restful.traceClause({
					target: `${tx.meta.blockID}/${txIndex}/0`,
					name: opts?.tracer,
					config: opts?.tracerConfig,
				})
			} else {
				// if tracerConfig.name not specified, it's struct logger
				// struct logger config is located at tracerConfig.config
				return await this.restful.traceClause({
					target: `${tx.meta.blockID}/${txIndex}/0`,
					name: opts?.tracer,
					config: opts?.config,
				})
			}
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	private _traceCall = async (params: any[]) => {
		/**
		 * debug_traceCall(callArgs, blockHashOrNumber ,tracerOptions)
		 * tracerOptions: {
		 * 	tracer: '', // name of tracer or custom js tracer code
		 * 	config: {}  // struct logger config object
		 * 	tracerConfig: {} // tracer specific config object
		 * }
		 */
		if(!this.restful) {
			return Promise.reject(new ProviderRpcError(ErrCode.Default, 'Restful API not supported'));
		}

		try {
			const callArgs = params[0]
			const revision = params[1]
			const opts = params[2]

			if (opts?.tracer) {
				return await this.restful.traceCall({
					... callArgs,
					name: opts?.tracer,
					config: opts?.tracerConfig,
				}, revision)
			} else {
				// if tracerConfig.name not specified, it's struct logger
				// struct logger config is located at tracerConfig.config
				return await this.restful.traceCall({
					... callArgs,
					name: opts.tracer,
					config: opts.config,
				}, revision)
			}
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}
}