'use strict';

import { Provider } from "./provider";
import { Net, Wallet, DelegateOpt, JsonRpcPayload } from './types';

export class ProviderWeb3 extends Provider {
	constructor(opt: {
		connex: Connex,
		wallet?: Wallet,
		net?: Net,
		delegate?: DelegateOpt,
	}) {
		super(opt);
	}

	sendAsync(
		payload: JsonRpcPayload,
		callback: (error: any, response?: any) => void
	) {
		super.request(payload)
			.then(ret => {
				callback(null, {
					id: payload.id,
					jsonrpc: '2.0',
					result: ret
				});
			})
			.catch(err => callback(err, {
				id: payload.id,
				jsonrpc: '2.0',
				error: err
			}));
	}
}