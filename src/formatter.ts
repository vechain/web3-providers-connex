'use strict';

import {
	JsonRpcPayload,
	Web3TxObj,
	RetLog,
	RetReceipt,
	RetBlock,
	RetTransaction,
	FilterOpts,
	ConvertedFilterOpts,
	RetHeader,
	CONST,
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
import { Err } from './error';

export class Formatter {
	private readonly _connex: Connex;
	private readonly _inputFormatters: Record<string, (params: any[]) => any[] | Error> = {};
	private readonly _ifSetNet: boolean;
	private readonly _ifReturnThorObj: boolean;

	constructor(connex: Connex, ifSetNet: boolean, ifReturnThorObj?: boolean) {
		this._connex = connex;
		this._ifSetNet = ifSetNet;
		if (ifReturnThorObj) {
			this._ifReturnThorObj = ifReturnThorObj;
		} else {
			this._ifReturnThorObj = false;
		}

		this._inputFormatters['eth_getBlockByNumber'] = this._getBlockByNumber;
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

	formatInput = (payload: JsonRpcPayload): any[] | Error => {
		const inputFormatter = this._inputFormatters[payload.method];
		if (!inputFormatter) { return payload.params || []; }
		if (!payload.params) { throw Err.ArgumentMissingOrInvalid(payload.method); }
		return inputFormatter(payload.params);
	}

	private _getBlockByNumber = (params: any[]) => {
		const num = parseBlockNumber(params[0]);
		if (num === null) {
			return Err.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockNumber');
		}
		// payload.params[0] = num;
		return [num];
	}

	private _getBalance = (params: any[]) => {
		if (!this._ifSetNet) {
			if (params.length == 2 &&
				!(typeof params[1] === 'string' && params[1] === 'latest')
			) {
				return Err.MethodParamNotSupported('eth_getBalance', 2);
			}
		} else if (typeof params[1] !== 'number') {
			const revision = parseBlockNumber(params[1] || 'latest');
			if (revision === null) {
				return Err.ArgumentMissingOrInvalid('eth_getBalance', 'revision');
			}
			params[1] = revision;
		}

		return params;
	}

	private _getCode = (params: any[]) => {
		if (!this._ifSetNet) {
			if (params.length >= 2 &&
				!(typeof params[1] === 'string' && params[1] === 'latest')
			) {
				return Err.MethodParamNotSupported('eth_getCode', 2);
			}
		} else if (typeof params[1] !== 'number') {
			const revision = parseBlockNumber(params[1] || 'latest');
			if (revision === null) {
				return Err.ArgumentMissingOrInvalid('eth_getCode', 'revision');
			}
			params[1] = revision;
		}

		return params;
	}

	private _getStorageAt = (params: any[]) => {
		if (!this._ifSetNet) {
			if (params.length >= 3 &&
				!(typeof params[2] === 'string' && params[2] === 'latest')
			) {
				return Err.MethodParamNotSupported('eth_getStorageAt', 3);
			}
		} else if (typeof params[1] !== 'number') {
			const revision = parseBlockNumber(params[2] || 'latest');
			if (revision === null) {
				return Err.ArgumentMissingOrInvalid('eth_getStorageAt', 'revision');
			}
			params[2] = revision;
		}

		params[1] = toBytes32(params[1]);
		return params;
	}

	private _sendTransaction = (params: any[]) => {
		const o1: Web3TxObj = params[0];
		const o2: ExplainArg = {
			clauses: [{
				to: !!o1.to ? o1.to : null,
				value: !!o1.value ? toHex(o1.value) : '0x0',
				data: !!o1.data ? o1.data : '0x',
			}],
			gas: !!o1.gas ? hexToNumber(o1.gas) : undefined,
			caller: o1.from,
		}

		return [o2];
	}

	private _call = (params: any[]) => {
		if (!this._ifSetNet) {
			if (params.length >= 2 &&
				!(typeof params[1] === 'string' && params[1] === 'latest')
			) {
				return Err.MethodParamNotSupported('eth_call', 2);
			}
		} else if (typeof params[1] !== 'number') {
			const revision = parseBlockNumber(params[1] || 'latest');
			if (revision == null) {
				return Err.ArgumentMissingOrInvalid('eth_call', 'revision');
			}
			params[1] = revision;
		}

		params[0] = this._sendTransaction(params)[0];
		return params;
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
				return Err.ArgumentMissingOrInvalid('eth_getPastLog', 'options.fromBlock');
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
				return Err.ArgumentMissingOrInvalid('eth_getPastLog', 'options.toBlock');
			}
			toBlock = test;
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
				return Err.InvalidSubscriptionName(name);
		}
	}

	private _sendRawTransaction = (params: any[]) => {
		const raw: string = params[0];
		if (!isHexStrict(raw)) {
			return Err.ArgumentMissingOrInvalid('eth_sendRawTransaction', 'raw');
		}
		return [raw];
	}

	outputReceiptFormatter = (receipt: Connex.Thor.Transaction.Receipt): RetReceipt => {
		const logs: RetLog[] = (receipt.outputs.length > 0 && receipt.outputs[0].events.length > 0) ?
			receipt.outputs[0].events.map(event => {
				return {
					blockHash: receipt.meta.blockID,
					blockNumber: toHex(receipt.meta.blockNumber),
					transactionHash: receipt.meta.txID,
					address: event.address,
					topics: event.topics.map((x) => x),
					data: event.data,

					removed: false,

					transactionIndex: '0x0',
					logIndex: '0x0',
				}
			}) : [];

		return {
			status: !receipt.reverted ? '0x1' : '0x0',

			blockHash: receipt.meta.blockID,
			blockNumber: toHex(receipt.meta.blockNumber),
			transactionHash: receipt.meta.txID,
			gasUsed: toHex(receipt.gasUsed),

			transactionIndex: '0x0',
			cumulativeGasUsed: '0x0',
			logsBloom: CONST.zeroBytes256,
			from: CONST.zeroAddress,
			to: CONST.zeroAddress,

			contractAddress: (receipt.outputs.length && receipt.outputs[0].contractAddress) ? receipt.outputs[0].contractAddress : null,
			logs: logs,

			thor: (this._ifReturnThorObj) ? receipt : undefined,
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
			sha3Uncles: CONST.zeroBytes32,
			nonce: CONST.zeroBytes8,
			logsBloom: CONST.zeroBytes256,
			extraData: '0x',

			thor: (this._ifReturnThorObj) ? b : undefined,
		};
	}

	outputTransactionFormatter = (tx: Connex.Thor.Transaction): RetTransaction => {
		return {
			hash: tx.id,
			blockNumber: toHex(tx.meta.blockNumber),
			blockHash: tx.meta.blockID,
			from: tx.origin,
			to: tx.clauses[0].to,
			input: tx.clauses[0].data,
			value: tx.clauses[0].value,
			gas: toHex(tx.gas),

			// incompatible fields
			transactionIndex: '0x0',
			nonce: '0x0',
			gasPrice: '0x0',

			thor: (this._ifReturnThorObj) ? tx : undefined,
		};
	}

	outputLogsFormatter = (ret: Connex.Thor.Filter.Row<'event'>[]): RetLog[] => {
		return ret.map((ret) => {
			return {
				address: ret.address,
				topics: ret.topics,
				data: ret.data,
				blockHash: ret.meta.blockID,
				blockNumber: toHex(ret.meta.blockNumber),
				transactionHash: ret.meta.txID,

				removed: false,

				transactionIndex: '0x0',
				logIndex: '0x0',
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
			sha3Uncles: CONST.zeroBytes32,
			nonce: CONST.zeroBytes8,
			logsBloom: CONST.zeroBytes256,
			extraData: '0x',
		}
	}
}