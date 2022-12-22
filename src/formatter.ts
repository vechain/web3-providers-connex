'use strict';

import {
	TxObj,
	RetLog,
	RetReceipt,
	RetBlock,
	RetTransaction,
	FilterOpts,
	ConvertedFilterOpts,
	RetHeader,
	ExplainArg,
} from './types';
import {
	hexToNumber,
	parseBlockNumber,
	toBytes32,
	toFilterCriteria,
	toHex,
	isHexStrict,
} from './utils';
import { ErrMsg, ErrCode } from './error';
import { zeroBytes8, zeroBytes32, zeroBytes256 } from './common';
import { ProviderRpcError } from './eip1193';

export class Formatter {
	private readonly _connex: Connex;
	private readonly _inputFormatters: Record<string, (params: any[]) => any[]> = {};
	private readonly _ifSetNet: boolean;

	constructor(connex: Connex, ifSetNet: boolean) {
		this._connex = connex;
		this._ifSetNet = ifSetNet;

		this._inputFormatters['eth_getBlockByNumber'] = this._getBlockByNumber;
		this._inputFormatters['eth_getBlockByHash'] = this._getBlockByHash;
		this._inputFormatters['eth_getBalance'] = this._getBalance;
		this._inputFormatters['eth_getCode'] = this._getCode;
		this._inputFormatters['eth_getStorageAt'] = this._getStorageAt;
		this._inputFormatters['eth_sendTransaction'] = this._sendTransaction;
		this._inputFormatters['eth_call'] = this._call;
		this._inputFormatters['eth_estimateGas'] = this._estimateGas;
		this._inputFormatters['eth_getLogs'] = this._getLogs;
		this._inputFormatters['eth_subscribe'] = this._subscribe;
		this._inputFormatters['eth_sendRawTransaction'] = this._sendRawTransaction;
	}

	formatInput = (method: string, params?: any[]): any[] => {
		const inputFormatter = this._inputFormatters[method];
		if (!inputFormatter) { return params || []; }
		if (!params) {
			const msg = 'Parameters missing';
			throw new ProviderRpcError(ErrCode.InvalidParams, msg);
		}
		return inputFormatter(params);
	}

	private _getBlockByNumber = (params: any[]) => {
		const num = parseBlockNumber(params[0]);
		if (num === null) {
			const msg = ErrMsg.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockNumber');
			throw new ProviderRpcError(ErrCode.InvalidParams, msg);
		}
		return [num];
	}

	private _getBlockByHash = (params: any[]) => {
		const num = params[0];
		if (num !== parseBlockNumber(num)) {
			const msg = ErrMsg.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockHash');
			throw new ProviderRpcError(ErrCode.InvalidParams, msg);
		}
		return [num];
	}

	private _getBalance = (params: any[]) => {
		let [addr, revision = 'latest'] = params;

		if (!this._ifSetNet) {
			if (params.length == 2 &&
				!(typeof revision === 'string' && revision === 'latest')
			) {
				const msg = ErrMsg.MethodParamNotSupported('eth_getBalance', 2);
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
		} else if (typeof revision !== 'number') {
			revision = parseBlockNumber(revision);
			if (revision === null) {
				const msg = ErrMsg.ArgumentMissingOrInvalid('eth_getBalance', 'revision');
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
		}

		return revision ? [addr, revision] : [addr];
	}

	private _getCode = (params: any[]) => {
		let [addr, revision = 'latest'] = params;

		if (!this._ifSetNet) {
			if (params.length >= 2 &&
				!(typeof revision === 'string' && revision === 'latest')
			) {
				const msg = ErrMsg.MethodParamNotSupported('eth_getCode', 2);
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
		} else if (typeof revision !== 'number') {
			revision = parseBlockNumber(revision); ``
			if (revision === null) {
				const msg = ErrMsg.ArgumentMissingOrInvalid('eth_getCode', 'revision');
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
		}

		return revision ? [addr, revision] : [addr];
	}

	private _getStorageAt = (params: any[]) => {
		let [addr, key, revision = 'latest'] = params;

		if (!this._ifSetNet) {
			if (params.length >= 3 &&
				!(typeof revision === 'string' && revision === 'latest')
			) {
				const msg = ErrMsg.MethodParamNotSupported('eth_getStorageAt', 3);
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
		} else if (typeof revision !== 'number') {
			revision = parseBlockNumber(revision);
			if (revision === null) {
				const msg = ErrMsg.ArgumentMissingOrInvalid('eth_getStorageAt', 'revision');
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
		}

		key = toBytes32(key);
		return revision ? [addr, key, revision] : [addr, key];
	}

	private _sendTransaction = (params: any[]) => {
		const o1: TxObj = params[0];
		const o2: ExplainArg = {
			clauses: [{
				to: o1.to || null,
				value: !!o1.value ? toHex(o1.value) : '0x0',
				data: o1.data || '0x',
			}],
			gas: !!o1.gas ? hexToNumber(o1.gas) : undefined,
			caller: o1.from,
		}

		return [o2, params[1]];
	}

	private _call = (params: any[]) => {
		let [callObj, revision = 'latest'] = params;

		if (!this._ifSetNet) {
			if (params.length >= 2 &&
				!(typeof revision === 'string' && revision === 'latest')
			) {
				const msg = ErrMsg.MethodParamNotSupported('eth_call', 2);
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
		} else if (typeof revision !== 'number') {
			revision = parseBlockNumber(revision);
			if (revision === null) {
				const msg = ErrMsg.ArgumentMissingOrInvalid('eth_call', 'revision');
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
		}

		callObj = this._sendTransaction([callObj])[0];
		return revision ? [callObj, revision] : [callObj];
	}

	private _estimateGas = (params: any[]) => {
		return this._sendTransaction(params);
	}

	private _getLogs = (params: any[]) => {
		const args: FilterOpts = params[0];

		let fromBlock: number, toBlock: number;
		
		if (!args.fromBlock) {
			fromBlock = this._connex.thor.status.head.number; // fromBlock default set to latest
		} else {
			let test = parseBlockNumber(args.fromBlock);
			if (test === undefined) {
				test = this._connex.thor.status.head.number;
			} else if (typeof test !== 'number') {
				const msg = ErrMsg.ArgumentMissingOrInvalid('eth_getLogs', 'options.fromBlock');
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
			fromBlock = test;
		}

		if (!args.toBlock) {
			toBlock = this._connex.thor.status.head.number; // toBlock default set to latest
		} else {
			let test = parseBlockNumber(args.toBlock);
			if (test === undefined) {
				test = this._connex.thor.status.head.number;
			} else if (typeof test !== 'number') {
				const msg = ErrMsg.ArgumentMissingOrInvalid('eth_getLogs', 'options.toBlock');
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
			}
			toBlock = test;
			if (fromBlock > toBlock) {
				fromBlock = toBlock;
			}
		}

		const out: ConvertedFilterOpts = {
			range: {
				unit: 'block',
				from: fromBlock,
				to: toBlock,
			},
			criteria: toFilterCriteria(args),
		}

		return [out];
	}

	private _subscribe = (params: any[]) => {
		const name: string = params[0];
		switch (name) {
			case 'newHeads':
				return ['newHeads'];
			case 'logs':
				return ['logs', toFilterCriteria(params[1])];
			default:
				const msg = ErrMsg.InvalidSubscriptionName(name);
				throw new ProviderRpcError(ErrCode.InvalidParams, msg);
		}
	}

	private _sendRawTransaction = (params: any[]) => {
		const raw: string = params[0];
		if (!isHexStrict(raw)) {
			const msg = ErrMsg.ArgumentMissingOrInvalid('eth_sendRawTransaction', 'raw');
			throw new ProviderRpcError(ErrCode.InvalidParams, msg);
		}
		return [raw];
	}

	outputReceiptFormatter = (
		receipt: Connex.Thor.Transaction.Receipt & { 
			transactionIndex: string, 
			logInds: string[],
			from: string, 
			to: string | null
		}
	): RetReceipt => {
		const logs: RetLog[] = (receipt.outputs.length > 0 && receipt.outputs[0].events.length > 0) ?
			receipt.outputs[0].events.map((event, index) => {
				return {
					blockHash: receipt.meta.blockID,
					blockNumber: toHex(receipt.meta.blockNumber),
					transactionHash: receipt.meta.txID,
					address: event.address,
					topics: event.topics.map((x) => x),
					data: event.data,

					removed: false,

					transactionIndex: receipt.transactionIndex,
					logIndex: receipt.logInds[index],
				}
			}) : [];

		return {
			status: !receipt.reverted ? '0x1' : '0x0',

			blockHash: receipt.meta.blockID,
			blockNumber: toHex(receipt.meta.blockNumber),
			transactionHash: receipt.meta.txID,
			gasUsed: toHex(receipt.gasUsed),
			transactionIndex: receipt.transactionIndex,
			from: receipt.from,
			to: receipt.to,

			cumulativeGasUsed: '0x0',
			logsBloom: zeroBytes256,
			// from: zeroBytes20,
			// to: zeroBytes20,

			contractAddress: (receipt.outputs.length && receipt.outputs[0].contractAddress) ? receipt.outputs[0].contractAddress : null,
			logs: logs,
		};
	}

	outputBlockFormatter = (b: Connex.Thor.Block): RetBlock => {
		return {
			hash: b.id,
			parentHash: b.parentID,
			number: toHex(b.number),
			size: toHex(b.size),
			stateRoot: b.stateRoot,
			receiptsRoot: b.receiptsRoot,
			transactionsRoot: b.txsRoot,
			timestamp: toHex(b.timestamp),
			gasLimit: toHex(b.gasLimit),
			gasUsed: toHex(b.gasUsed),
			transactions: b.transactions,
			miner: b.signer,

			// incompatible fields
			difficulty: '0x0',
			totalDifficulty: '0x0',
			uncles: [],
			sha3Uncles: zeroBytes32,
			nonce: zeroBytes8,
			logsBloom: zeroBytes256,
			extraData: '0x',
		};
	}

	outputTransactionFormatter = (tx: Connex.Thor.Transaction & { transactionIndex: string }): RetTransaction => {
		return {
			hash: tx.id,
			blockNumber: toHex(tx.meta.blockNumber),
			blockHash: tx.meta.blockID,
			from: tx.origin,
			to: tx.clauses[0].to,
			input: tx.clauses[0].data,
			value: tx.clauses[0].value,
			gas: toHex(tx.gas),

			transactionIndex: tx.transactionIndex,

			// incompatible fields
			nonce: '0x0',
			gasPrice: '0x0'
		};
	}

	outputLogsFormatter = (
		ret: {logs: Connex.Thor.Filter.Row<'event'>[], txInds: string[], logInds: string[] }
	): RetLog[] => {
		return ret.logs.map((log, i) => {
			return {
				address: log.address,
				topics: log.topics,
				data: log.data,
				blockHash: log.meta.blockID,
				blockNumber: toHex(log.meta.blockNumber),
				transactionHash: log.meta.txID,

				removed: false,

				transactionIndex: ret.txInds[i],
				logIndex: ret.logInds[i],
			};
		});
	}

	outputHeaderFormatter = (b: Connex.Thor.Block): RetHeader => {
		return {
			hash: b.id,
			parentHash: b.parentID,
			number: toHex(b.number),
			stateRoot: b.stateRoot,
			receiptsRoot: b.receiptsRoot,
			transactionsRoot: b.txsRoot,
			timestamp: toHex(b.timestamp),
			gasLimit: toHex(b.gasLimit),
			gasUsed: toHex(b.gasUsed),
			miner: b.signer,

			// incompatible fields
			sha3Uncles: zeroBytes32,
			nonce: zeroBytes8,
			logsBloom: zeroBytes256,
			extraData: '0x',
		}
	}
}