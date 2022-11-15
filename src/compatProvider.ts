'use strict';

import { ProviderRpcError, RequestArguments } from "./eip1193";
import { Provider } from "./provider";
import { Net, Wallet, DelegateOpt, JsonRpcPayload } from './types';
import { decodeRevertReason } from "./utils";

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
				if (payload.method === 'eth_call' || payload.method === 'eth_estimateGas') {
					const errMsg = decodeRevertReason(ret);
					if (errMsg) {
						callback(null, {
							id: payload.id,
							jsonrpc: '2.0',
							error: {
								data: ret,
								message: errMsg
							}
						})
					}
				} else {
					callback(null, {
						id: payload.id,
						jsonrpc: '2.0',
						result: ret
					});
				}
			})
			.catch(err => callback(err));
	}
}

export class ProviderEthers extends Provider {
	constructor(opt: {
		connex: Connex,
		wallet?: Wallet,
		net?: Net,
		delegate?: DelegateOpt,
	}) {
		super(opt);
	}

	async request(req: RequestArguments): Promise<any> {
		try {
			const ret = await super.request(req);
			if (req.method === 'eth_call' || req.method === 'eth_estimateGas') {
				const errMsg = decodeRevertReason(ret);
				if (errMsg) {
					return Promise.reject({
						data: ret,
						message: errMsg
					})
				}
			}
			return ret;
		} catch (err: any) {
			return Promise.reject(err as ProviderRpcError);
		}
	}
}