'use strict';

import {
	JsonRpcPayload,
	Web3TxObj,
	ConnexTxObj,
	RetLog,
	RetReceipt,
	RetBlock,
	RetTransaction,
	ConvertedPayload,
	FilterOpts,
	ConvertedFilterOpts,
} from './types';
import { hexToNumber, parseBlockNumber, toBytes32, toFilterCriteria } from './utils';
import { Err } from './error';

const emptyPayload: ConvertedPayload = {
	id: 0,
	params: [],
}

export const InputFormatter: Record<string, (payload: JsonRpcPayload) => { payload: ConvertedPayload, err: TypeError | null }> = {};

InputFormatter.eth_getBlockByNumber = function (payload: JsonRpcPayload) {
	const num = parseBlockNumber(payload.params[0]);
	if (num === null) {
		return {
			payload: emptyPayload,
			err: Err.BlockNotFound('pending')
		};
	}
	// payload.params[0] = num;
	return {
		payload: { id: payload.id, params: [num] },
		err: null
	};
}

InputFormatter.eth_getBalance = function (payload: JsonRpcPayload) {
	if (payload.params.length == 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return {
			payload: emptyPayload,
			err: Err.MethodParamNotSupported('eth_getBalance', 2)
		};
	}
	return {
		payload: { id: payload.id, params: payload.params },
		err: null
	};
}

InputFormatter.eth_getCode = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('eth_getCode', 2) };
	}
	return {
		payload: { id: payload.id, params: payload.params },
		err: null
	};
}

InputFormatter.eth_getStorageAt = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 3 &&
		!(typeof payload.params[2] === 'string' && payload.params[2] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('eth_getStorageAt', 3) };
	}

	let params = payload.params.map((x) => x);
	params[1] = toBytes32(params[1]);
	return {
		payload: { id: payload.id, params: params },
		err: null
	};
}

InputFormatter.eth_sendTransaction = function (payload: JsonRpcPayload) {
	const o1: Web3TxObj = payload.params[0];
	const o2: ConnexTxObj = {
		clauses: [{
			to: !!o1.to ? o1.to : null,
			value: !!o1.value ? o1.value : 0,
			data: !!o1.data ? o1.data : '0x',
		}],
		gas: !!o1.gas ? hexToNumber(o1.gas) : undefined,
		from: o1.from,
	}

	return {
		payload: { id: payload.id, params: [o2] },
		err: null
	};
}

InputFormatter.eth_call = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('eth_call', 2) };
	}

	return InputFormatter.eth_sendTransaction(payload);
}

InputFormatter.eth_estimateGas = function (payload: JsonRpcPayload) {
	return InputFormatter.eth_sendTransaction(payload);
}

InputFormatter.eth_getLogs = function (payload: JsonRpcPayload) {
	const args: FilterOpts = payload.params[0];

	// cannot be null
	const fromBlock = parseBlockNumber(args.fromBlock);
	if (typeof fromBlock !== 'number') {
		return {
			payload: emptyPayload,
			err: Err.ArgumentMissingOrInvalid('eth_getPastLog', 'options.fromBlock'),
		};
	}

	const toBlock = parseBlockNumber(args.toBlock);
	if (typeof toBlock !== 'number') {
		return {
			payload: emptyPayload,
			err: Err.ArgumentMissingOrInvalid('eth_getPastLog', 'options.toBlock'),
		};
	}

	const out: ConvertedFilterOpts = {
		range: {
			unit: 'block',
			from: fromBlock,
			to: toBlock,
		},
		criteria: toFilterCriteria(args),
	}

	return {
		payload: { id: payload.id, params: [out] },
		err: null
	};
}

InputFormatter.eth_subscribe = function (payload: JsonRpcPayload) {
	const name: string = payload.params[0];
	if (!name) {
		throw new TypeError('Subscription name undefined');
	}

	switch (name) {
		case 'newHeads':
			return {
				payload: { id: payload.id, params: ['newHeads'] },
				err: null
			};
		case 'logs':
			return {
				err: null,
				payload: {
					id: payload.id,
					params: ['logs', toFilterCriteria(payload.params[1])],
				}
			}
		default:
			return { err: Err.InvalidSubscriptionName(name), payload: emptyPayload };
	}
}

export const outputReceiptFormatter = function toRetReceipt(receipt: Connex.Thor.Transaction.Receipt): RetReceipt {
	const logs: RetLog[] = (receipt.outputs.length > 0 && receipt.outputs[0].events.length > 0) ?
		receipt.outputs[0].events.map(event => {
			return {
				blockHash: receipt.meta.blockID,
				blockNumber: receipt.meta.blockNumber,
				transactionHash: receipt.meta.txID,
				address: event.address,
				topics: event.topics.map((x) => x),
				data: event.data,

				transactionIndex: null,
				logIndex: null,
			}
		}) : [];

	return {
		status: !receipt.reverted ? '0x1' : '0x0',

		blockHash: receipt.meta.blockID,
		blockNumber: receipt.meta.blockNumber,
		transactionHash: receipt.meta.txID,
		gasUsed: receipt.gasUsed,

		transactionIndex: null,
		cumulativeGasUsed: null,
		effectiveGasPrice: null,
		logsBloom: null,
		from: null,
		to: null,

		contractAddress: (receipt.outputs.length && receipt.outputs[0].contractAddress) ? receipt.outputs[0].contractAddress : undefined,
		logs: logs,

		thor: receipt,
	};
}

export const outputBlockFormatter = function (b: Connex.Thor.Block): RetBlock {
	return {
		hash: b.id,
		parentHash: b.parentID,
		number: b.number,
		size: b.size,
		stateRoot: b.stateRoot,
		receiptsRoot: b.receiptsRoot,
		transactionRoot: b.txsRoot,
		timestamp: b.timestamp,
		gasLimit: b.gasLimit,
		gasUsed: b.gasUsed,
		transactions: b.transactions,
		miner: b.signer,

		// incompatible fields
		difficulty: null,
		totalDifficulty: null,
		uncles: null,
		sha3Uncles: null,
		nonce: null,
		logsBloom: null,
		extraData: null,

		// original block returned by connex
		thor: b,
	};
}

export const outputTransactionFormatter = function (tx: Connex.Thor.Transaction): RetTransaction {
	return {
		hash: tx.id,
		blockNumber: tx.meta.blockNumber,
		blockHash: tx.meta.blockID,
		from: tx.origin,
		to: tx.clauses[0].to,
		input: tx.clauses[0].data,
		value: tx.clauses[0].value,
		gas: tx.gas,
		transactionIndex: null,

		// incompatible fields
		nonce: null,
		gasPrice: null,

		thor: tx,
	};
}

export const outputLogsFormatter = function (ret: Connex.Thor.Filter.Row<'event'>[]): RetLog[] {
	return ret.map((ret) => {
		return {
			address: ret.address,
			topics: ret.topics,
			data: ret.data,
			blockHash: ret.meta.blockID,
			blockNumber: ret.meta.blockNumber,
			transactionHash: ret.meta.txID,
			transactionIndex: null,
			logIndex: null,
		};
	});
}