'use strict';

import Connex from '@vechain/connex';
import {
	JsonRpcPayload,
	Callback,
	ConnexTxObj,
	ConvertedPayload,
	ConvertedFilterOpts
} from './types';
import { toRpcResponse, hexToNumber, getErrMsg, toFilterCriteria, toSubscriptionResponse } from './utils';
import { Err } from './error';
import {
	InputFormatter,
	outputBlockFormatter,
	outputLogsFormatter,
	outputReceiptFormatter,
	outputTransactionFormatter,
} from './formatter';
import { Transaction, keccak256 } from 'thor-devkit';
import EventEmitter from 'eventemitter3';

type MethodHandler = (payload: ConvertedPayload, callback: Callback) => void;

export class ConnexProvider extends EventEmitter {
	readonly connex: Connex;
	readonly chainTag: number;

	private readonly _methodMap: Record<string, MethodHandler> = {};
	// Map<name, >
	private _subscriptions: Record<'newHeads' | 'logs', Record<string, any[]>> = {
		newHeads: {},
		logs: {},
	};

	constructor(connex: Connex) {
		super();

		this.connex = connex;
		const id = connex.thor.genesis.id;
		this.chainTag = hexToNumber('0x' + id.substring(id.length - 2));

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

		// dummy
		this._methodMap['eth_gasPrice'] = this._gasPrice;

		// console.log('Start subloop');
		this._subLoop();
	}

	/**
	 * Function [send] defined in interface [AbstractProvider]
	 * @param {Jsonpayload} payload 
	 * @param {Callback} callback 
	 * @returns 
	 */
	public sendAsync(payload: JsonRpcPayload, callback: Callback) {
		const exec = this._methodMap[payload.method];
		if (!exec) {
			callback(Err.MethodNotFound(payload.method));
			return;
		}

		let _payload: ConvertedPayload = {
			id: payload.id,
			params: payload.params
		};

		if (InputFormatter[payload.method]) {
			const input = InputFormatter[payload.method](payload);
			if (input.err) {
				callback(input.err);
				return;
			}
			_payload = input.payload;
		}
		exec(_payload, callback);
	}

	private _subscribe = (payload: ConvertedPayload, callback: Callback) => {
		const subId = this._getSubscriptionId(payload.params);
		const subName: string = payload.params[0];

		if (subName !== 'newHeads' && subName !== 'logs') {
			callback(Err.InvalidSubscriptionName(subName));
			return;
		}

		if (this._subscriptions[subName][subId]) {
			callback(Err.SubscriptionAlreadyExist());
			return;
		}

		this._subscriptions[subName][subId] = payload.params[1] || {};

		callback(null, toRpcResponse(subId, payload.id));
	}

	private _unsubscribe = (payload: ConvertedPayload, callback: Callback) => {
		const subId: string = payload.params[0];

		if (!this._subscriptions['newHeads'][subId] && !this._subscriptions['logs'][subId]) {
			callback(Err.SubscriptionIdNotFound);
		}

		this._subscriptions['newHeads'][subId] ?
			delete this._subscriptions['newHeads'][subId] :
			delete this._subscriptions['logs'][subId];

		callback(null, toRpcResponse(true, payload.id));
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
									this.emit('data', toSubscriptionResponse(
										outputBlockFormatter(blk), key
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
								this.emit('data', toSubscriptionResponse(
									outputLogsFormatter(ret), key
								));
							}
						} catch { }
					});
				}
			}
		} catch(err: any) {
			throw new TypeError(err);
		}
	}

	private _getSubscriptionId = (params: any[]) => {
		return '0x' + keccak256(JSON.stringify(params)).toString('hex');
	}

	private _getLogs = (payload: ConvertedPayload, callback: Callback) => {
		const MAX_LIMIT = 256;
		const params: ConvertedFilterOpts = payload.params[0];
		this.connex.thor.filter('event', params.criteria)
			.range(params.range)
			.apply(0, MAX_LIMIT)
			.then((ret: Connex.Thor.Filter.Row<'event'>[]) => {
				callback(null, toRpcResponse(
					outputLogsFormatter(ret),
					payload.id,
				));
			})
			.catch(err => {
				callback(err);
			});
	}

	private _estimateGas = (payload: ConvertedPayload, callback: Callback) => {
		const txObj: ConnexTxObj = payload.params[0];
		let explainer = this.connex.thor.explain([txObj.clauses[0]]);
		if (txObj.from) { explainer = explainer.caller(txObj.from); }
		if (txObj.gas) { explainer = explainer.gas(txObj.gas); }
		explainer.execute()
			.then((outputs: Connex.VM.Output[]) => {
				const output = outputs[0];
				if (output.reverted) {
					callback({ data: getErrMsg(output) });
				}

				const clause: Transaction.Clause = {
					to: txObj.clauses[0].to,
					value: txObj.clauses[0].value,
					data: txObj.clauses[0].data ? txObj.clauses[0].data : '0x',
				};

				const execGas = outputs.reduce((sum, out) => sum + out.gasUsed, 0);
				const intrinsicGas = Transaction.intrinsicGas([clause]);
				const estimatedGas = intrinsicGas + (execGas ? (execGas + 15000) : 0);

				callback(null, toRpcResponse(estimatedGas, payload.id));
			})
			.catch(err => {
				callback(err)
			});
	}

	private _call = (payload: ConvertedPayload, callback: Callback) => {
		const txObj: ConnexTxObj = payload.params[0];
		let explainer = this.connex.thor.explain([txObj.clauses[0]]);
		if (txObj.from) { explainer = explainer.caller(txObj.from); }
		if (txObj.gas) { explainer = explainer.gas(txObj.gas); }
		explainer.execute()
			.then((outputs: Connex.VM.Output[]) => {
				const output = outputs[0];
				if (output.reverted) {
					callback({ data: getErrMsg(output) });
				}

				callback(null, toRpcResponse(output.data, payload.id));
			})
			.catch(err => {
				callback(err)
			});
	}

	private _gasPrice = (payload: ConvertedPayload, callback: Callback) => {
		callback(null, toRpcResponse(0, payload.id));
	}

	private _sendTransaction = (payload: ConvertedPayload, callback: Callback) => {
		const txObj: ConnexTxObj = payload.params[0];
		let ss = this.connex.vendor.sign('tx', [txObj.clauses[0]]);
		if (txObj.from) { ss = ss.signer(txObj.from); }
		if (txObj.gas) { ss = ss.gas(txObj.gas); }
		ss.request()
			.then(ret => {
				callback(null, toRpcResponse(ret.txid, payload.id));
			})
			.catch(err => {
				callback(err);
			});
	}

	private _getStorageAt = (payload: ConvertedPayload, callback: Callback) => {
		this.connex.thor.account(payload.params[0]).getStorage(payload.params[1])
			.then(storage => {
				callback(null, toRpcResponse(storage.value, payload.id));
			})
			.catch(err => {
				callback(err);
			});
	}

	private _getTransactionReceipt = (payload: ConvertedPayload, callback: Callback) => {
		this.connex.thor.transaction(payload.params[0]).getReceipt()
			.then(receipt => {
				if (!receipt) {
					callback(null, toRpcResponse(null, payload.id));
				} else {
					callback(null, toRpcResponse(
						outputReceiptFormatter(receipt),
						payload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			});
	}

	private _isSyncing = (payload: ConvertedPayload, callback: Callback) => {
		this.connex.thor.ticker().next()
			.then(() => {
				if (this.connex.thor.status.progress == 1) {
					callback(null, toRpcResponse(false, payload.id));
				} else {
					const highestBlock = Math.floor(
						(Date.now() - this.connex.thor.genesis.timestamp) / 10000
					);
					callback(null, toRpcResponse(
						{
							currentBlock: this.connex.thor.status.head.number,
							highestBlock: highestBlock,
							thor: this.connex.thor.status,
						},
						payload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getCode = (payload: ConvertedPayload, callback: Callback) => {
		this.connex.thor.account(payload.params[0]).getCode()
			.then(code => {
				callback(null, toRpcResponse(code.code, payload.id));
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getBlockNumber = (payload: ConvertedPayload, callback: Callback) => {
		this.connex.thor.block().get()
			.then(blk => {
				if (!blk) {
					callback(Err.BlockNotFound('latest'));
				} else {
					callback(null, toRpcResponse(
						blk.number,
						payload.id
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getBalance = (payload: ConvertedPayload, callback: Callback) => {
		this.connex.thor.account(payload.params[0]).get()
			.then(acc => {
				callback(null, toRpcResponse(
					acc.balance,
					payload.id,
				))
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getTransactionByHash = (payload: ConvertedPayload, callback: Callback) => {
		const hash: string = payload.params[0];
		this.connex.thor.transaction(hash).get()
			.then(tx => {
				if (!tx) {
					callback(Err.TransactionNotFound(hash));
				} else {
					callback(null, toRpcResponse(
						outputTransactionFormatter(tx),
						payload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getChainId = (payload: ConvertedPayload, callback: Callback) => {
		callback(null, toRpcResponse(
			this.chainTag,
			payload.id,
		));
	}

	private _getBlockByNumber = (payload: ConvertedPayload, callback: Callback) => {
		const num = payload.params[0];
		this.connex.thor.block(num).get()
			.then(blk => {
				if (!blk) {
					callback(Err.BlockNotFound(num ? num : 'lastest'));
				} else {
					callback(null, toRpcResponse(
						outputBlockFormatter(blk),
						payload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getBlockByHash = (payload: ConvertedPayload, callback: Callback) => {
		const hash: string = payload.params[0];
		this.connex.thor.block(hash).get()
			.then(blk => {
				if (!blk) {
					callback(Err.BlockNotFound(hash));
				} else {
					callback(null, toRpcResponse(
						outputBlockFormatter(blk),
						payload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}
}