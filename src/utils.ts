/// <reference types="@vechain/connex" />

'use strict';

import { RetBlock, RetLog, RetReceipt, RetTransaction } from './types'
import { JsonRpcResponse } from 'web3-core-helpers'
import { randomBytes } from 'crypto';
const web3Utils = require('web3-utils');

export const toRetBlock = function (b: Connex.Thor.Block): RetBlock {
	return {
		...b, ...{
			hash: b.id,
			parentHash: b.parentID,
		}
	};
}

export const toRpcResponse = function (ret: any, id: number): JsonRpcResponse {
	return {
		id: id,
		jsonrpc: '2.0',
		result: ret,
	}
}

export const toRetTransaction = function (tx: Connex.Thor.Transaction): RetTransaction {
	return {
		...tx, ...{
			hash: tx.id,
			blockNumber: tx.meta.blockNumber,
			blockHash: tx.meta.blockID,

			thorNonce: tx.nonce,
			nonce: null,

			from: tx.origin,
			to: tx.clauses[0].to,
			input: tx.clauses[0].data,
			value: tx.clauses[0].value,

			transactionIndex: null,
		}
	}
}

export function toRetReceipt(receipt: Connex.Thor.Transaction.Receipt): RetReceipt {
	const retLog: RetLog[] = receipt.outputs[0].events.map(event => {
		return {
			...event, ...{
				blockHash: receipt.meta.blockID,
				blockNumber: receipt.meta.blockNumber,
				transactionHash: receipt.meta.txID,
				transactionIndex: null,
				logIndex: null,
			}
		}
	});

	return {
		...receipt, ...{
			status: !receipt.reverted ? 1 : 0,
			blockHash: receipt.meta.blockID,
			blockNumber: receipt.meta.blockNumber,
			transactionHash: receipt.meta.txID,

			transactionIndex: null,
			cumulativeGasUsed: null,
			from: null,
			to: null,

			contractAddress: receipt.outputs.length ? receipt.outputs[0].contractAddress : null,
			logs: retLog,
		}
	}
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