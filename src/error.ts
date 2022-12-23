'use strict';

export const ErrMsg = {
	MethodParamNotSupported: (method: string, index: number) => {
		return `Parameter not supported: method=${method}, index=${index}`;
	},

	ArgumentMissingOrInvalid: (method: string, arg?: string) => {
		let err = `Argument missing or invalid: method=${method}`;
		if (arg) { err += `, arg=${arg}` };
		return err;
	},

	SubscriptionIdNotFound: (id: string) => {
		return `Subscription not found: id=${id}`;
	},

	InvalidSubscriptionName: (name: string) => {
		return `Invalid subscription: name=${name}`;
	}
}

// Source https://docs.infura.io/infura/networks/ethereum/json-rpc-methods
export const ErrCode = {
	// Standard
	ParseError: -32700,					// Invalid JSON
	InvalidRequest: -32600,				// JSON is not a valid request object
	MethodNotFound: -32601,				// Method does not exist
	InvalidParams: -32602,				// Invalid method parameters
	InternalError: -32603,				// Internal JSON-RPC error

	// https://github.com/ethereum/go-ethereum/blob/master/rpc/errors.go
	Default: -32000				
}