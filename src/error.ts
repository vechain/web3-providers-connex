'use strict';

export const Err = {
	BlockNotFound: (ref: string | number) => {
		const msg = typeof ref === 'string' && ref.indexOf('0x') == 0 ? 'id/hash=' : 'number';
		return new Error(`No block found with ${msg}=${ref}`);
	},

	MethodNotFound: (method: string) => {
		return new Error(`Method [${method}] not supported`);
	},

	TransactionNotFound: (hash: string) => {
		return new Error(`No transaction found with id/hash=${hash}`);
	},

	MethodParamNotSupported: (method: string, index: number) => {
		return new Error(`Parameter with index=${index} of method=${method} not supported`);
	},

	ArgumentMissingOrInvalid: (method: string, arg: string) => {
		return new Error(`Argument missing or invalid: method=${method}, argName=${arg}`);
	},

	SubscriptionIdNotFound: (id: string) => {
		return new Error(`Subscription id=${id} not found`);
	},

	SubscriptionAlreadyExist: () => {
		return new Error(`Subscription already exists`);
	},

	InvalidSubscriptionName: (name: string) => {
		return new Error(`Invalid subscription name=${name}`);
	}
}