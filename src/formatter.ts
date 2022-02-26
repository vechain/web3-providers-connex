'use strict';

import { 
	JsonRpcPayload, 
	Web3TxObj, 
	ConnexTxObj,
	RetLog, RetReceipt, RetBlock, RetTransaction,
} from './types';
import { hexToNumber, toBlockNumber, toBytes32 } from './utils';
import { Err } from './error';

const emptyPayload: JsonRpcPayload = {
	id: 0,
	method: '',
	params: [],
	jsonrpc: ''
}

export const InputFormatter: Record<string, (payload: JsonRpcPayload) => { payload: JsonRpcPayload, err: TypeError | null }> = {};

InputFormatter.eth_getBlockByNumber = function (payload: JsonRpcPayload) {
	const num = toBlockNumber(payload.params[0]);
	if (num === null) {
		return { payload: emptyPayload, err: Err.BlockNotFound('pending') }
	}
	payload.params[0] = num;
	return { payload: payload, err: null };
}

InputFormatter.eth_getBalance = function (payload: JsonRpcPayload) {
	if (payload.params.length == 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('getBalance', 2) };
	}
	return { payload: payload, err: null };
}

InputFormatter.eth_getCode = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('getCode', 2) };
	}
	return { payload: payload, err: null };
}

InputFormatter.eth_getStorageAt = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 3 &&
		!(typeof payload.params[2] === 'string' && payload.params[2] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('getStorageAt', 3) };
	}

	payload.params[1] = toBytes32(payload.params[1]);
	return { payload: payload, err: null };
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
		data: o1.data,
	}
	payload.params[0] = o2;

	return { payload: payload, err: null };
}

InputFormatter.eth_call = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 2 &&
		!(typeof payload.params[2] === 'string' && payload.params[2] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('call', 2) };
	}

	return InputFormatter.eth_sendTransaction(payload);
}

export const outputReceiptFormatter = function toRetReceipt(receipt: Connex.Thor.Transaction.Receipt): RetReceipt {
	const logs: RetLog[] = receipt.outputs[0].events.map(event => {
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
	});

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