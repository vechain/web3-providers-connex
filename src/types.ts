'use strict';

import { RequestArguments } from "./eip1193";

export type ZeroBytes8 = '0x0000000000000000'
export type ZeroBytes20 = '0x0000000000000000000000000000000000000000'
export type ZeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
export type ZeroBytes256 = '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'


// Defined in @vechain/connex-driver
export interface Net {
	/** base URL */
	readonly baseURL: string;
	/**
	 * perform http request
	 * @param method 'GET' or 'POST'
	 * @param path path to access
	 * @param params additional params
	 * @returns response body, JSON decoded
	 */
	http(method: 'GET' | 'POST', path: string, params?: Net.Params): Promise<any>;
	/**
	 * open websocket reader on path
	 * @param path
	 */
	openWebSocketReader(path: string): Net.WebSocketReader;
}

// Defined in @vechain/connex-driver
export declare namespace Net {
	/** http request params */
	interface Params {
		query?: Record<string, string>;
		body?: any;
		headers?: Record<string, string>;
		validateResponseHeader?: (headers: Record<string, string>) => void;
	}
	/** websocket reader */
	interface WebSocketReader {
		/** read data */
		read(): Promise<any>;
		close(): void;
	}
}

// Wallet interface manages private keys
export interface Wallet {
	/** list all keys */
	readonly list: Wallet.Key[];
}
export declare namespace Wallet {
	/** describes an operational key */
	interface Key {
		/** address derived from key */
		address: string;
		/**
		 * sign message hash
		 * @param msgHash message hash
		 * @returns signature
		 */
		sign(msgHash: Buffer): Promise<Buffer>;
	}
}


export type ExplainArg = {
	clauses: Array<{
		to: string | null
		value: string
		data: string
	}>;
	caller?: string;
	gas?: number;
	gasPrice?: string;
};

// Defined in web3-core
export interface AbstractProvider {
	sendAsync(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void;
	send?(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void;
	request?(args: RequestArguments): Promise<any>;
	connected?: boolean;
}

// Defined in web3-core-helper
export interface JsonRpcPayload extends RequestArguments{
	jsonrpc: string;
	id?: number | string;
}

// Defined in web3-core-helper
export interface JsonRpcResponse {
	id: number;
	jsonrpc: string;
	result?: any;
	error?: any;
}

export interface RetBlock extends RetHeader {
	size: string;				// number in hex string	
	transactions: string[];		// bytes32 array

	// Unsupported fields
	difficulty: '0x0';
	totalDifficulty: '0x0';
	uncles: [];
	baseFeePerGas: '0x0';
}
export interface RetHeader {
	number: string; 			// number in hex string
	hash: string; 				// bytes32
	parentHash: string; 		// bytes32
	transactionsRoot: string;	// bytes32
	stateRoot: string;			// bytes32
	receiptsRoot: string;		// bytes32
	miner: string;				// bytes20			
	gasLimit: string;			// number in hex string			
	gasUsed: string;			// number in hex string
	timestamp: string;			// number in hex string

	// Unsupported fields
	sha3Uncles: ZeroBytes32;
	nonce: ZeroBytes8;
	logsBloom: ZeroBytes256;
	extraData: '0x';
}

export interface RetTransaction {
	hash: string;				// bytes32
	blockHash: string;			// bytes32 
	blockNumber: string;		// number in hex string
	from: string;				// bytes20
	to: string | null;			// bytes20 | null
	value: string;				// number in hex string
	gas: string;				// number in hex string
	input: string;
	transactionIndex: string;	// number in hex string

	// incompatible fields
	nonce: '0x0';
	gasPrice: '0x0';
	signature: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
}

export interface RetReceipt {
	transactionHash: string;		// bytes32
	blockHash: string;				// bytes32
	blockNumber: string;			// number in hex string
	contractAddress: string | null;	// bytes20 | null 
	gasUsed: string;				// number in hex string
	transactionIndex: string		// bytes32
	from: string					// bytes20
	to: string | null				// bytes20 | null

	status: '0x0' | '0x1';

	// incompatible fields
	logsBloom: ZeroBytes256;
	cumulativeGasUsed: '0x0';

	logs: RetLog[];
}

export interface RetLog {
	address: string;			// bytes20
	data: string;				// data
	topics: string[];			// bytes32 array
	transactionHash: string;	// bytes32	
	blockHash: string;			// bytes32
	blockNumber: string;		// number in hex string

	removed: false;

	logIndex: string;			// number in hex string
	transactionIndex: string;	// number in hex string
}

export type TxObj = {
	to?: string;
	from?: string;
	value?: string;
	data?: string;
	gas?: string;
	gasPrice?: string;
	input?: string;		// Added to support requests from web3.js
}

export type FilterOpts = {
	address?: string | string[];
	fromBlock?: string;
	toBlock?: string;
	topics?: string[] | string[][];
}

export type ConvertedFilterOpts = {
	range: Connex.Thor.Filter.Range;
	criteria: Connex.Thor.Filter.Criteria<'event'>[];
}

export type DelegateOpt = {
	url: string;
	signer?: string;
}

export interface TracerOption {
	name: string;
	config: object;
}

export interface TraceClauseOption extends TracerOption {
	target: string;
}

export interface TraceCallOption extends TracerOption{
	to: string | null
	value: string
	data: string
	caller?: string;
	gas?: number;
	gasPrice?: string;
}