'use strict';

export interface JsonRpcPayload {
	id: number;
	jsonrpc: string;
	method: string;
	params: any[];
}

export type Callback = (err: Error | null, result?: any) => void;

export interface RetBlock {
	hash: string;
	parentHash: string;
	number: number;

	thor: Connex.Thor.Block;
}

export interface RetTransaction {
	hash: string;
	blockHash: string | null;
	blockNumber: number | null;
	from: string;
	to: string | null;
	value: string;
	input: string;
	gas: number;

	transactionIndex: null;
	nonce: null;

	thor: Connex.Thor.Transaction;
}

export interface RetReceipt {
	status: boolean | number;
	transactionHash: string;
	blockHash: string;
	blockNumber: number;
	contractAddress: string | null;

	from: null;
	to: null;
	cumulativeGasUsed: null;
	transactionIndex: null;

	logs: RetLog[];

	thor: Connex.Thor.Transaction.Receipt;
}

export interface RetLog {
	logIndex: null;
	transactionIndex: null;
	transactionHash: string;
	blockHash: string;
	blockNumber: number;
	
	address: string;
	topics: string[];
	data: string;

	thor: Connex.VM.Event;
}

export interface Web3TxObj {
	to?: string;
	from?: string;
	value?: string;
	data?: string;
	gas?: string;
}

export interface ConnexTxObj {
	clauses: [Connex.VM.Clause];
	signer?: string;
	gas?: number;

	// Including fields 'from', 'data' to allow 'Method.prototype._confirmTransaction' 
	// to get correct 'isContractDeployment'
	from?: string;
	data?: string;
}