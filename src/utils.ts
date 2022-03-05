'use strict';

import { JsonRpcResponse } from 'web3-core-helpers'
import { randomBytes } from 'crypto';
import web3Utils from 'web3-utils';
import { abi } from 'thor-devkit';
import { FilterOpts, SubscriptionResponse } from './types';

export const toRpcResponse = function (ret: any, id: number): JsonRpcResponse {
	return {
		id: id,
		jsonrpc: '2.0',
		result: ret,
	};
}

export const toSubscriptionResponse = function(ret: any, id: string): SubscriptionResponse {
	return {
		jsonrpc: '2.0',
		method: 'eth_subscribe',
		params: {
			subscription: id,
			result: ret,
		}
	}
}

/**
 * Convert the input into either block id or block number compatible with connex.thor.block()
 * @param {hex | 'earliest' | 'latest' | 'pending'} input
 * @returns {string | number | null | undefined} Return null not recognized and undefined if input === 'latest'
 */
export function parseBlockNumber(input: string): string | number | null | undefined {
	// Return block id;
	if (web3Utils.isHexStrict(input) && input.length == 66) {
		return input;
	}

	// Convert block number;
	let num: number | null | undefined = null;
	if (web3Utils.isHexStrict(input)) { num = web3Utils.hexToNumber(input); }
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

export function toFilterCriteria(args: FilterOpts): Connex.Thor.Filter.Criteria<"event">[] {
	const setCriteria = (address: string, topics: any) => {
		const c: Connex.Thor.Filter.Criteria<"event"> = {};

		c.address = address;
		if (topics[0]) { c.topic0 = topics[0]; }
		if (topics[1]) { c.topic1 = topics[1]; }
		if (topics[2]) { c.topic2 = topics[2]; }
		if (topics[3]) { c.topic3 = topics[3]; }

		return c;
	}

	return !Array.isArray(args.address) ?
		[setCriteria(args.address, args.topics)] :
		args.address.map((addr, i) => {
			return setCriteria(addr, args.topics[i]);
		});
}

export const wait = (ms: number) => {
	return new Promise(resolve => {
		setTimeout(() => resolve(true), ms);
	});
}