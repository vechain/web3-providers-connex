'use strict';

export type JsonRpcPayload = {
	id: number;
	jsonrpc?: string;
	method: string;
	params: any[];
}

export type Callback = (err: any, result?: any) => void;

export type hex = string;

export const CONST = {
	zeroBytes8: '0x' + '0'.repeat(16),
	zeroBytes32: '0x' + '0'.repeat(64),
	zeroBytes256: '0x' + '0'.repeat(512),
	zeroAddress: '0x' + '0'.repeat(40),
}

export interface RetBlock extends RetHeader {
	size: hex;					// number	
	transactions: string[];		// bytes32 array

	// Unsupported fields
	difficulty: '0x0';			
	totalDifficulty: '0x0';		
	uncles: [];					

	thor?: Connex.Thor.Block;
}

export interface RetHeader {
	number: hex; 				// number
	hash: string; 				// bytes32
	parentHash: string; 		// bytes32
	transactionsRoot: string;	// bytes32
	stateRoot: string;			// bytes32
	receiptsRoot: string;		// bytes32
	miner: string;				// bytes20			
	gasLimit: hex;				// number			
	gasUsed: hex;				// number
	timestamp: hex;				// number


	// Unsupported fields
	sha3Uncles: string;			// zero bytes32
	nonce: string;				// zero bytes8
	logsBloom: string;			// zero bytes256
	extraData: '0x';
}

export interface RetTransaction {
	hash: string;				// bytes32
	blockHash: string;			// bytes32 
	blockNumber: hex;			// number
	from: string;				// bytes20
	to: string | null;			// bytes20 | null
	value: hex;					// number
	gas: hex;					// number
	input: string;

	// incompatible fields
	transactionIndex: '0x0';
	nonce: '0x0';
	gasPrice: '0x0';

	thor?: Connex.Thor.Transaction;
}

export interface RetReceipt {
	transactionHash: string;		// bytes32
    blockHash: string;				// bytes32
    blockNumber: hex;				// number
    contractAddress: string | null;	// bytes20 | null 
    gasUsed: hex;					// number

	status: '0x0' | '0x1';

	// incompatible fields
	from: string;					// zero bytes20	
	to: string;						// zero bytes20
	transactionIndex: '0x0';		
	logsBloom: string;				// zero bytes256						
	cumulativeGasUsed: '0x0';	

	logs: RetLog[];

	thor?: Connex.Thor.Transaction.Receipt;
}

export interface RetLog {
	address: string;			// bytes20
	data: string;				// data
	topics: string[];			// bytes32 array
	transactionHash: string;	// bytes32	
	blockHash: string;			// bytes32
	blockNumber: hex;			// number

	removed: false;

	logIndex: '0x0';
	transactionIndex: '0x0';
}

export type Web3TxObj = {
	to?: string;
	from?: string;
	value?: string;
	data?: string;
	gas?: string;
}

export interface ConnexTxObj extends Omit<Web3TxObj, 'gas'> {
	clauses: [Connex.VM.Clause];
	gas?: number;
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

export type Eip1193SubResp = {
	jsonrpc?: string;
	type: string;
	data: {
		subscription: string;
		result: any;
	};
}