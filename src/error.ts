'use strict';

export const ErrMsg = {
	MethodNotFound: (method: string) => {
		return `Method not supported: method=${method}`;
	},

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

	SubscriptionAlreadyExist: (id: string) => {
		return `Subscription already exists: id=${id}`;
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
	// Non-standard
	InvalidInput: -32000,				// Missing or invalid parameters
	ResourceNotFound: -32001,			// Requested resource not found
	ResourceUnavailable: -32002,		// Requested resource not available
	TransactionRejected: -32003,		// Transaction creation failed
	MethodNotSupported: -32004,			// Method is not implemented
	LimitExceeded: -32005,				// Request exceeds defined limit
	JsonRpcVersionNotSupported: -32006	// Version of JSON-RPC protocol is not supported
}