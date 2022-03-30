'use strict';

export const Err = {
	BlockNotFound: (ref: string | number) => {
		const msg = typeof ref === 'string' && ref.indexOf('0x') == 0 ? 'id/hash=' : 'number';
		return new Error(`Block not found: ${msg}=${ref}`);
	},

	MethodNotFound: (method: string) => {
		return new Error(`Method [${method}] not supported`);
	},

	TransactionNotFound: (hash: string) => {
		return new Error(`Transaction not found: id/hash=${hash}`);
	},

	MethodParamNotSupported: (method: string, index: number) => {
		return new Error(`Parameter not supported: method=${method}, index=${index}`);
	},

	ArgumentMissingOrInvalid: (method: string, arg: string) => {
		return new Error(`Argument missing or invalid: method=${method}, arg=${arg}`);
	},

	SubscriptionIdNotFound: (id: string) => {
		return new Error(`Subscription not found: id=${id}`);
	},

	SubscriptionAlreadyExist: (id: string) => {
		return new Error(`Subscription already exists: id=${id}`);
	},

	InvalidSubscriptionName: (name: string) => {
		return new Error(`Invalid subscription: name=${name}`);
	}
}