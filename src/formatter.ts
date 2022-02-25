'use strict';

import { JsonRpcPayload, Web3TxObj, ConnexTxObj } from './types';
import { hexToNumber, toBlockNumber, toBytes32 } from './utils';
import { Err } from './error';

const emptyPayload: JsonRpcPayload = {
	id: 0,
	method: '',
	params: [],
	jsonrpc: ''
}

export const InputFormatter: Record<string, (payload: JsonRpcPayload) => { payload: JsonRpcPayload, err: TypeError | null }> = {};

InputFormatter.eth_getBlockByNumber = function (payload: JsonRpcPayload) {
	const num = toBlockNumber(payload.params[0]);
	if (num === null) {
		return { payload: emptyPayload, err: Err.BlockNotFound('pending') }
	}
	payload.params[0] = num;
	return { payload: payload, err: null };
}

InputFormatter.eth_getBalance = function (payload: JsonRpcPayload) {
	if (payload.params.length == 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('getBalance', 2) };
	}
	return { payload: payload, err: null };
}

InputFormatter.eth_getCode = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 2 &&
		!(typeof payload.params[1] === 'string' && payload.params[1] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('getCode', 2) };
	}
	return { payload: payload, err: null };
}

InputFormatter.eth_getStorageAt = function (payload: JsonRpcPayload) {
	if (payload.params.length >= 3 &&
		!(typeof payload.params[2] === 'string' && payload.params[2] === 'latest')
	) {
		return { payload: emptyPayload, err: Err.MethodParamNotSupported('getStorageAt', 3) };
	}

	payload.params[1] = toBytes32(payload.params[1]);
	return { payload: payload, err: null };
}

InputFormatter.eth_sendTransaction = function (payload: JsonRpcPayload) {
	const o1: Web3TxObj = payload.params[0];
	const o2: ConnexTxObj = {
		clauses: [{
			to: !!o1.to ? o1.to : null,
			value: !!o1.value ? o1.value : 0,
			data: !!o1.data ? o1.data : '0x',
		}],
		gas: !!o1.gas ? hexToNumber(o1.gas) : undefined,

		from: o1.from,
		data: o1.data,
	}
	payload.params[0] = o2;

	return { payload: payload, err: null };
}