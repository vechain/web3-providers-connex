'use strict';

import { JsonRpcResponse } from 'web3-core-helpers'
import { randomBytes } from 'crypto';
import web3Utils from 'web3-utils';
import { abi } from 'thor-devkit';

export const toRpcResponse = function (ret: any, id: number): JsonRpcResponse {
	return {
		id: id,
		jsonrpc: '2.0',
		result: ret,
	};
}

/**
 * Convert the block number into format compatible with connex.js
 * @param {hex | 'earliest' | 'latest' | 'pending'} input
 * @returns {number | null | undefined} Return null if input === 'pending' and undefined if input === 'latest'
 */
export function toBlockNumber(input: string): number | null | undefined {
	let num: number | null | undefined = null;

	if (web3Utils.isHex(input)) { num = web3Utils.hexToNumber(input); }
	else if (input === 'earliest') { num = 0; }
	else if (input === 'latest') { num = undefined; }

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

export function getErrMsg(output: Connex.VM.Output): string {
	const errorSig = '0x08c379a0';
	let errMsg = output?.revertReason || output.vmError || output.data;

	if (!errMsg.startsWith('0x')) {
		// encode error message to allow sendTxCallback to decode later
		errMsg = abi.encodeParameter('string', errMsg);
	}

	if (!errMsg.startsWith(errorSig)) {
		errMsg = errorSig + errMsg.slice(2);
	}

	return errMsg;
}