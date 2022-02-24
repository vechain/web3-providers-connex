'use strict';

export const Err = {
	BlockNotFound: (ref: string | number) => {
		const msg = typeof ref === 'string' && ref.indexOf('0x') == 0 ? 'id/hash=' : 'number';
		return new TypeError(`No block found with ${msg}=${ref}`);
	},

	MethodNotFound: (method: string) => {
		return new TypeError(`Method [${method}] not supported`);
	},

	TransactionNotFound: (hash: string) => {
		return new TypeError(`No transaction found with id/hash=${hash}`);
	},

	// InvalidBlockHash: (hash: string) => {
	// 	return new TypeError(`Invalid block id/hash=${hash}`);
	// },

	// InvalidBlockNumber: (number: string | number) => {
	// 	return new TypeError(`Invalid block number=${number}`);
	// },

	// InvalidTransactionHash: (hash: string) => {
	// 	return new TypeError(`Invalid transaction id/hash=${hash}`);
	// },

	// InvalidStorageKey: (key: string | number) => {
	// 	return new TypeError(`Invalid storage key=${key}`);
	// },

	MethodParamNotSupported: (method: string, index: number) => {
		return new TypeError(`Parameter with index=${index}} of method=${method} not supported`);
	}
}