/// <reference types="@vechain/connex" />

'use strict';

import { RetBlock, RetReceipt, RetTransaction, RetLog } from './types'
import { JsonRpcResponse } from 'web3-core-helpers'
import { randomBytes } from 'crypto';

const web3Utils = require('web3-utils');

export const toRetBlock = function (b: Connex.Thor.Block): RetBlock {
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

export const toRpcResponse = function (ret: any, id: number): JsonRpcResponse {
	return {
		id: id,
		jsonrpc: '2.0',
		result: ret,
	};
}

export const toRetTransaction = function (tx: Connex.Thor.Transaction): RetTransaction {
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

export function toRetReceipt(receipt: Connex.Thor.Transaction.Receipt): RetReceipt {
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
		status: !receipt.reverted ? 1 : 0,
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

/**
 * Convert the block number into format compatible with connex.js
 * @param {hex | 'earliest' | 'latest' | 'pending'} input
 * @returns {number | null | undefined} Return null if input === 'pending' and undefined if input === 'latest'
 */
export function toBlockNumber(input: string): number | null | undefined {
	let num: number | null | undefined;

	if (web3Utils.isHex(input)) { num = web3Utils.hexToNumber(input); }
	else if (input === 'earliest') { num = 0; }
	else if (input === 'pending') { num = null; }

	return num;
}

export function toBytes32(hex: string): string {
	return web3Utils.padLeft(hex, 64);
}

export function hexToNumber(hex: string): number {
	return web3Utils.hexToNumber(hex);
}

export function randAddr(): string {
	return '0x' + randomBytes(20).toString('hex');
}