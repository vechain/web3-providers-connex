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

	MethodParamNotSupported: (method: string, index: number) => {
		return new TypeError(`Parameter with index=${index} of method=${method} not supported`);
	},

	ArgumentMissingOrInvalid: (method: string, arg: string) => {
		return new TypeError(`Argument missing or invalid: method=${method}, argName=${arg}`);
	},

	SubscriptionIdNotFound: (id: string) => {
		return new TypeError(`Subscription id=${id} not found`);
	},

	SubscriptionAlreadyExist: () => {
		return new TypeError(`Subscription already exists`);
	},

	InvalidSubscriptionName: (name: string) => {
		return new TypeError(`Invalid subscription name=${name}`);
	}
}