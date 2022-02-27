'use strict';

import Connex from '@vechain/connex';
import { JsonRpcPayload, Callback, ConnexTxObj, ConvertedPayload } from './types';
import { toRpcResponse, hexToNumber } from './utils';
import { Err } from './error';
import {
	InputFormatter,
	outputBlockFormatter,
	outputReceiptFormatter,
	outputTransactionFormatter,
} from './formatter';

type MethodHandler = (payload: ConvertedPayload, callback: Callback) => void;

export class ConnexProvider {
	readonly connex: Connex;
	readonly chainTag: number;

	private readonly methodMap: Record<string, MethodHandler> = {};

	constructor(connex: Connex) {
		this.connex = connex;
		const id = connex.thor.genesis.id;
		this.chainTag = hexToNumber('0x' + id.substring(id.length - 2));

		this.methodMap['eth_getBlockByHash'] = this._getBlockByHash;
		this.methodMap['eth_getBlockByNumber'] = this._getBlockByNumber;
		this.methodMap['eth_chainId'] = this._getChainId;
		this.methodMap['eth_getTransactionByHash'] = this._getTransactionByHash;
		this.methodMap['eth_getBalance'] = this._getBalance;
		this.methodMap['eth_blockNumber'] = this._getBlockNumber;
		this.methodMap['eth_getCode'] = this._getCode;
		this.methodMap['eth_syncing'] = this._isSyncing;
		this.methodMap['eth_getTransactionReceipt'] = this._getTransactionReceipt;
		this.methodMap['eth_getStorageAt'] = this._getStorageAt;
		this.methodMap['eth_sendTransaction'] = this._sendTransaction;
		this.methodMap['eth_call'] = this._call;

		this.methodMap['eth_gasPrice'] = this._gasPrice;
	}

	/**
	 * Function [send] defined in interface [AbstractProvider]
	 * @param {Jsonpayload} payload 
	 * @param {Callback} callback 
	 * @returns 
	 */
	public sendAsync(payload: JsonRpcPayload, callback: Callback) {
		const exec = this.methodMap[payload.method];
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

	private _call = (payload: ConvertedPayload, callback: Callback) => {
		const txObj: ConnexTxObj = payload.params[0];
		let explainer = this.connex.thor.explain(txObj.clauses);
		if (txObj.from) { explainer = explainer.caller(txObj.from); }
		if (txObj.gas) { explainer = explainer.gas(txObj.gas); }
		explainer.execute()
			.then((ret: Connex.VM.Output[]) => {
				callback(null, toRpcResponse(ret[0].data, payload.id));
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
		let ss = this.connex.vendor.sign('tx', txObj.clauses);
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
					head: this.connex.thor.status.head,
				},
				payload.id,
			));
		}
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