'use strict';

import { Block, Transaction, TransactionReceipt, BlockHeader } from 'web3-eth';
import { Log } from 'web3-core';

export type JsonRpcPayload = {
	id: number;
	jsonrpc?: string;
	method: string;
	params: any[];
}

export type Callback = (err: any, result?: any) => void;

export interface RetBlock extends Omit<Block,
	'difficulty' |
	'totalDifficulty' |
	'uncles' |
	'sha3Uncles' |
	'nonce' |
	'logsBloom'
> {
	// incompatible fields
	difficulty: null;
	totalDifficulty: null;
	uncles: null;
	sha3Uncles: null;
	nonce: null;
	logsBloom: null;

	thor?: Connex.Thor.Block;
}

export interface RetHeader extends Omit<BlockHeader,
	'nonce' |
	'sha3Uncles' |
	'logsBloom' |
	'extraData'
> {
	nonce: null;
	sha3Uncles: null;
	logsBloom: null;
	extraData: null;
}

export interface RetTransaction extends Omit<Transaction, 'gasPrice'> {
	// incompatible fields
	// nonce: null;
	gasPrice: null;

	thor?: Connex.Thor.Transaction;
}

export interface RetReceipt extends Omit<TransactionReceipt,
	'status' |
	'effectiveGasPrice' |
	'logsBloom' |
	'from' |
	'to' |
	'logs'
> {
	// To account for web3.utils.formatters.outputTransactionReceiptFormatter
	// that format status using 
	// 		receipt.status = Boolean(parseInt(receipt.status));
	status: '0x0' | '0x1';

	// incompatible fields
	effectiveGasPrice: null;
	logsBloom: null;
	from: null;
	to: null;

	logs: RetLog[];

	thor?: Connex.Thor.Transaction.Receipt;
}

export interface RetLog extends Log { }

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
	address: string | string[];
	fromBlock: string;
	toBlock: string;
	topics: any;
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