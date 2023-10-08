'use strict';

import { randomBytes } from 'crypto';
import * as web3Validator from 'web3-validator';
import * as web3Utils from 'web3-utils';
import { abi, Transaction } from 'thor-devkit';
import { FilterOpts, Wallet, TxObj } from './types';
import { Subscription } from './eip1193';
import { Provider } from './provider';

export const toSubscription = function (ret: any, id: string): Subscription {
	return {
		type: 'eth_subscription',
		data: {
			subscription: id,
			result: ret,
		}
	}
}

/**
 * Convert the input into either block id or block number compatible with connex.thor.block()
 * @param {hex | 'earliest' | 'latest' } input
 * @returns {string | number | null | undefined} Return null not recognized and undefined if input === 'latest'
 */
export function parseBlockNumber(input: string): string | number | undefined | null {
	// Return block id;
	if (web3Validator.isHexStrict(input) && input.length == 66) {
		return input;
	}

	// Convert block number;
	if (web3Validator.isHexStrict(input)) { 
		const blockNum = web3Utils.hexToNumber(input); 
		if (typeof blockNum === 'number') {
			return blockNum;
		} else {
			throw new Error('Invalid block number');
		}
	}
	else if (input === 'earliest') { return 0; }
	else if (input === 'latest') { return undefined; }

	return null;
}

export function toBytes32(hex: string): string {
	return web3Utils.padLeft(hex, 64);
}

export function hexToNumber(hex: string): number {
	const n = web3Utils.hexToNumber(hex);
	if (typeof n === 'number') {
		return n;
	}

	throw new Error('Invalid hex number');
}

export function toHex(value: number | string): string {
	return web3Utils.toHex(BigInt(value));
}

export function randAddr(): string {
	return '0x' + randomBytes(20).toString('hex');
}

export function isHexStrict(hex: string) {
	return web3Validator.isHexStrict(hex);
}

/**
 * Decompose (T | T[] | null)[] into (T | null)[]. 
 * E.g., [1, [2, 3], null, 4] => [[1 , 2, null, 4], [1, 3, null, 4]]
 */
function decompose<T>(x: (T | T[] | null)[]): (T | null)[][] {
	let y: (T | null)[][] = []

	// Create instances for the first element
	if (Array.isArray(x[0])) {
		x[0].forEach(x => y.push([x, null, null, null]))
	} else {
		y.push([x[0], null, null, null])
	}

	for (let i = 1; i < x.length; i++) {
		const xi = x[i]

		if (xi === null) { continue }

		if (!Array.isArray(xi)) {
			// Update the i'th element for the existing instances
			y.forEach(e => e[i] = xi)
			continue
		}

		// Update the i'th row of y with value xi[0]
		y.forEach(e => e[i] = xi[0])

		// make a copy of y
		const cpy = y.map(e => e.map(e => e))
		for (let j = 1; j < xi.length; j++) {
			// Duplicate the current copy and 
			// assign a new value for the i'th element
			const yy = cpy.map(e => e.map(e => e))
			yy.forEach(e => e[i] = xi[j])

			// Attach the new instances
			y = y.concat(yy)
		}
	}

	return y
}

export function toFilterCriteria(args: FilterOpts): Connex.Thor.Filter.Criteria<"event">[] {
	const setCriteria = (address?: string, topics?: any) => {
		const c: Connex.Thor.Filter.Criteria<"event"> = {};

		if (address) { c.address = address };
		if (topics) {
			if (topics[0]) { c.topic0 = topics[0]; }
			if (topics[1]) { c.topic1 = topics[1]; }
			if (topics[2]) { c.topic2 = topics[2]; }
			if (topics[3]) { c.topic3 = topics[3]; }
		}

		return c;
	}

	let ret: Connex.Thor.Filter.Criteria<"event">[] = [];

	// Address and topics both unavailable
	if (!args.address && !args.topics) { return []; }

	// Only address available
	if (!args.topics) {
		if (Array.isArray(args.address)) {
			args.address.forEach(addr => ret.push(setCriteria(addr)));
		} else {
			ret.push(setCriteria(args.address));
		}
		return ret;
	}

	// Decompose topics
	let topics = decompose<string>(args.topics);
	let address: (string | undefined)[]
	if (!args.address) { address = [undefined] }
	else if (!Array.isArray(args.address)) { address = [args.address]; }
	else { address = args.address; }
	address.forEach(addr => {
		topics.forEach(topics => {
			ret.push(setCriteria(addr, topics));
		});
	});
	return ret;
}

export const wait = (ms: number) => {
	return new Promise(resolve => {
		setTimeout(() => resolve(true), ms);
	});
}

/** params for tx construction */
const txParams = {
	expiration: 18,
	gasPriceCoef: 0
}

export const signTransaction = async (ethTx: TxObj, key: Wallet.Key, provider: Provider): Promise<string> => {
	const clauses = [{
		to: ethTx.to || null,
		value: ethTx.value ? toHex(ethTx.value) : '0x0',
		data: ethTx.data || '0x'
	}];

	const gas = ethTx.gas || await provider.request({
		method: 'eth_estimateGas',
		params: [ethTx]
	});

	const chainId = provider.chainTag;

	const best = await provider.request({
		method: 'eth_getBlockByNumber',
		params: ['latest']
	});

	const txBody: Transaction.Body = {
		chainTag: chainId,
		blockRef: best.hash.slice(0, 18),
		expiration: txParams.expiration,
		clauses,
		gasPriceCoef: txParams.gasPriceCoef,
		gas,
		dependsOn: null,
		nonce: '0x' + randomBytes(8).toString('hex')
	}

	const tx = new Transaction(txBody)
	tx.signature = await key.sign(tx.signingHash());

	return '0x' + tx.encode().toString('hex');
}

export function decodeRevertReason(data: string): string | null {
	const errSig = '0x08c379a0'
	try {
		if (data.startsWith(errSig)) {
			return abi.decodeParameter('string', '0x' + data.slice(errSig.length)) as string
		}
		return null
	} catch {
		return null
	}
}

export function getErrMsg(err: any): string {
	let msg: string = '';
	if (typeof err === 'string') {
		msg = err;
	} else if (err.message) {
		msg = err.message;
	}

	return msg;
}