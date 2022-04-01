'use strict';

import {
	JsonRpcPayload,
	Web3TxObj,
	ConnexTxObj,
	RetLog,
	RetReceipt,
	RetBlock,
	RetTransaction,
	FilterOpts,
	ConvertedFilterOpts,
	RetHeader,
} from './types';
import { hexToNumber, parseBlockNumber, toBytes32, toFilterCriteria } from './utils';
import { Err } from './error';
import web3Utils from 'web3-utils';

export const InputFormatter: Record<string, (payload: JsonRpcPayload) => any[] | Error> = {};

InputFormatter.eth_getBlockByNumber = function (payload: JsonRpcPayload) {
	const num = parseBlockNumber(payload.params[0]);
	if (num === null) {
		return Err.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockNumber');
	}
	// payload.params[0] = num;
	return [num];
}

InputFormatter.eth_getBalance = function (payload: JsonRpcPayload) {
	if (payload.params.length == 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return Err.MethodParamNotSupported('eth_getBalance', 2);
	}
	return payload.params;
}

InputFormatter.eth_getCode = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return Err.MethodParamNotSupported('eth_getCode', 2);
	}
	return payload.params;
}

InputFormatter.eth_getStorageAt = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 3 &&
		!(typeof payload.params[2] === 'string' && payload.params[2] === 'latest')
	) {
		return Err.MethodParamNotSupported('eth_getStorageAt', 3);
	}

	let params = payload.params.map((x) => x);
	params[1] = toBytes32(params[1]);
	return params;
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

	return [o2];
}

InputFormatter.eth_call = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return Err.MethodParamNotSupported('eth_call', 2);
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
		return Err.ArgumentMissingOrInvalid('eth_getPastLog', 'options.fromBlock');
	}

	const toBlock = parseBlockNumber(args.toBlock);
	if (typeof toBlock !== 'number') {
		return Err.ArgumentMissingOrInvalid('eth_getPastLog', 'options.toBlock');
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

InputFormatter.eth_subscribe = function (payload: JsonRpcPayload) {
	const name: string = payload.params[0];
	if (!name) {
		throw new Error('Subscription name undefined');
	}

	switch (name) {
		case 'newHeads':
			return ['newHeads'];
		case 'logs':
			return ['logs', toFilterCriteria(payload.params[1])];
		default:
			return Err.InvalidSubscriptionName(name);
	}
}

InputFormatter.eth_sendRawTransaction = function(payload: JsonRpcPayload) {
	const raw: string = payload.params[0];
	if(!web3Utils.isHexStrict(raw)){
		return Err.ArgumentMissingOrInvalid('eth_sendRawTransaction', 'raw');
	}
	return [raw];
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
		extraData: '0x',

		// incompatible fields
		difficulty: null,
		totalDifficulty: null,
		uncles: null,
		sha3Uncles: null,
		nonce: null,
		logsBloom: null,

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

export const outputHeaderFormatter = function (b: Connex.Thor.Block): RetHeader {
	return {
		hash: b.id,
		parentHash: b.parentID,
		number: b.number,
		stateRoot: b.stateRoot,
		receiptsRoot: b.receiptsRoot,
		transactionRoot: b.txsRoot,
		timestamp: b.timestamp,
		gasLimit: b.gasLimit,
		gasUsed: b.gasUsed,
		miner: b.signer,

		// unsupported
		nonce: null,
		sha3Uncles: null,
		logsBloom: null,
		extraData: null,
	}
}