'use strict';

export type JsonRpcPayload = {
	id: number;
	jsonrpc?: string;
	method: string;
	params: any[];
}

export type Callback = (err: any, result?: any) => void;

export type hex = string;

export interface RetBlock extends RetHeader {
	size: hex;
	transactions: string[];

	// incompatible fields
	difficulty: null;
	totalDifficulty: null;
	uncles: null;
	sha3Uncles: null;
	nonce: null;
	logsBloom: null;

	thor?: Connex.Thor.Block;
}

export interface RetHeader {
	number: hex;
	hash: string;
	parentHash: string;
	transactionRoot: string;
	stateRoot: string;
	receiptsRoot: string;
	miner: string;
	gasLimit: hex;
	gasUsed: hex;
	timestamp: hex;

	nonce: null;
	sha3Uncles: null;
	logsBloom: null;
	extraData: '0x';
}

export interface RetTransaction {
	hash: string;
	blockHash: string | null;
	blockNumber: hex | null;
	from: string;
	to: string | null;
	value: string;
	gas: number;
	input: string;

	// incompatible fields
	transactionIndex: -1;
	nonce: -1;
	gasPrice: null;

	thor?: Connex.Thor.Transaction;
}

export interface RetReceipt {
	transactionHash: string;
    blockHash: string;
    blockNumber: hex;
    contractAddress?: string;
    gasUsed: hex;
   
	// To account for web3.utils.formatters.outputTransactionReceiptFormatter
	// that format status using 
	// 		receipt.status = Boolean(parseInt(receipt.status));
	status: '0x0' | '0x1';

	// incompatible fields
	effectiveGasPrice: null;
	logsBloom: null;
	from: null;
	to: null;
	transactionIndex: -1;
	cumulativeGasUsed: -1;

	logs: RetLog[];

	thor?: Connex.Thor.Transaction.Receipt;
}

export interface RetLog {
	address: string;
	data: string;
	topics: string[];
	transactionHash: string;
	blockHash: string;
	blockNumber: hex;

	logIndex: -1;
	transactionIndex: -1;
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