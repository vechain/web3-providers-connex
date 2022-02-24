'use strict';

export interface JsonRpcPayload {
	id: number;
	jsonrpc: string;
	method: string;
	params: any[];
}

export type Callback = (err: Error | null, result?: any) => void;

export interface RetBlock extends Connex.Thor.Block {
	hash: string;
	parentHash: string;
}

export interface RetTransaction extends Omit<Connex.Thor.Transaction, 'nonce'> {
	hash: string;
	blockHash: string | null;
	blockNumber: number | null;
	from: string;
	to: string | null;
	value: string;
	input: string;

	transactionIndex: null;
	nonce: null;

	thorNonce: string; // to distinguish from [nonce] defined in Eth tx model
}

export interface RetReceipt extends Connex.Thor.Transaction.Receipt {
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
}

export interface RetLog extends Connex.VM.Event {
	logIndex: null;
	transactionIndex: null;
	transactionHash: string;
	blockHash: string;
	blockNumber: number;
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