'use strict';

import { Block, Transaction, TransactionReceipt } from 'web3-eth';

export interface JsonRpcPayload {
	id: number;
	jsonrpc: string;
	method: string;
	params: any[];
}

export type Callback = (err: Error | null, result?: any) => void;

export interface RetBlock extends Block {
	thor?: Connex.Thor.Block;
}

export interface RetTransaction extends Transaction {
	thor?: Connex.Thor.Transaction;
}

export interface RetReceipt extends Omit<TransactionReceipt, 'status'> {
	// To account for web3.utils.formatters.outputTransactionReceiptFormatter
	// that format status using 
	// 		receipt.status = Boolean(parseInt(receipt.status));
	status: number;

	thor?: Connex.Thor.Transaction.Receipt;
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