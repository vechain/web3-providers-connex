'use strict';

import Connex from '@vechain/connex';
import { JsonRpcPayload, Callback, ConnexTxObj } from './types';
import { toRpcResponse, hexToNumber } from './utils';
import { Err } from './error';
import {
	InputFormatter,
	outputBlockFormatter,
	outputReceiptFormatter,
	outputTransactionFormatter,
} from './formatter';

type MethodHandler = (rpcPayload: JsonRpcPayload, callback: Callback) => void;

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
	 * @param {JsonRpcPayload} rpcPayload 
	 * @param {Callback} callback 
	 * @returns 
	 */
	public sendAsync(rpcPayload: JsonRpcPayload, callback: Callback) {
		const exec = this.methodMap[rpcPayload.method];
		if (!exec) {
			callback(Err.MethodNotFound(rpcPayload.method));
			return;
		}

		let _rpcPayload = rpcPayload;
		if (InputFormatter[rpcPayload.method]) {
			const input = InputFormatter[rpcPayload.method](rpcPayload);
			if (input.err) {
				callback(input.err);
				return;
			}
			_rpcPayload = input.payload;
		}
		exec(_rpcPayload, callback);
	}

	private _call = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		const txObj: ConnexTxObj = rpcPayload.params[0];
		let explainer = this.connex.thor.explain(txObj.clauses);
		if (txObj.from) { explainer = explainer.caller(txObj.from); }
		if (txObj.gas) { explainer = explainer.gas(txObj.gas); }
		explainer.execute()
			.then((ret: Connex.VM.Output[]) => {
				callback(null, toRpcResponse(ret[0], rpcPayload.id));
			})
			.catch(err => {
				callback(err)
			});
	}

	private _gasPrice = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		callback(null, toRpcResponse(0, rpcPayload.id));
	}

	private _sendTransaction = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		const txObj: ConnexTxObj = rpcPayload.params[0];
		let ss = this.connex.vendor.sign('tx', txObj.clauses);
		if (txObj.from) { ss = ss.signer(txObj.from); }
		if (txObj.gas) { ss = ss.gas(txObj.gas); }
		ss.request()
			.then(ret => {
				callback(null, toRpcResponse(ret.txid, rpcPayload.id));
			})
			.catch(err => {
				callback(err);
			});
	}

	private _getStorageAt = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		this.connex.thor.account(rpcPayload.params[0]).getStorage(rpcPayload.params[1])
			.then(storage => {
				callback(null, toRpcResponse(storage.value, rpcPayload.id));
			})
			.catch(err => {
				callback(err);
			});
	}

	private _getTransactionReceipt = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		this.connex.thor.transaction(rpcPayload.params[0]).getReceipt()
			.then(receipt => {
				if (!receipt) {
					callback(null, toRpcResponse(null, rpcPayload.id));
				} else {
					callback(null, toRpcResponse(
						outputReceiptFormatter(receipt),
						rpcPayload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			});
	}

	private _isSyncing = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		if (this.connex.thor.status.progress == 1) {
			callback(null, toRpcResponse(false, rpcPayload.id));
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
				rpcPayload.id,
			));
		}
	}

	private _getCode = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		this.connex.thor.account(rpcPayload.params[0]).getCode()
			.then(code => {
				callback(null, toRpcResponse(code.code, rpcPayload.id));
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getBlockNumber = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		this.connex.thor.block().get()
			.then(blk => {
				if (!blk) {
					callback(Err.BlockNotFound('latest'));
				} else {
					callback(null, toRpcResponse(
						blk.number,
						rpcPayload.id
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getBalance = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		this.connex.thor.account(rpcPayload.params[0]).get()
			.then(acc => {
				callback(null, toRpcResponse(
					acc.balance,
					rpcPayload.id,
				))
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getTransactionByHash = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		const hash: string = rpcPayload.params[0];
		this.connex.thor.transaction(hash).get()
			.then(tx => {
				if (!tx) {
					callback(Err.TransactionNotFound(hash));
				} else {
					callback(null, toRpcResponse(
						outputTransactionFormatter(tx),
						rpcPayload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getChainId = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		callback(null, toRpcResponse(
			this.chainTag,
			rpcPayload.id,
		));
	}

	private _getBlockByNumber = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		const num = rpcPayload.params[0];
		this.connex.thor.block(num).get()
			.then(blk => {
				if (!blk) {
					callback(Err.BlockNotFound(num ? num : 'lastest'));
				} else {
					callback(null, toRpcResponse(
						outputBlockFormatter(blk),
						rpcPayload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}

	private _getBlockByHash = (rpcPayload: JsonRpcPayload, callback: Callback) => {
		const hash: string = rpcPayload.params[0];
		this.connex.thor.block(hash).get()
			.then(blk => {
				if (!blk) {
					callback(Err.BlockNotFound(hash));
				} else {
					callback(null, toRpcResponse(
						outputBlockFormatter(blk),
						rpcPayload.id,
					));
				}
			})
			.catch(err => {
				callback(err);
			})
	}
}