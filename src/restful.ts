'use strict';

import { Net, ExplainArg } from './types';
import { getErrMsg } from './utils';

export class Restful {
	private readonly _net: Net;
	private readonly _genesisId: string;

	constructor(net: Net, genesisId: string) {
		this._net = net;
		this._genesisId = genesisId;
	}

	private get _headerValidator() {
		return (headers: Record<string, string>) => {
			const xgid = headers['x-genesis-id']
			if (xgid && xgid !== this._genesisId) {
				throw new Error(`responded 'x-genesis-id' not matched`)
			}
		}
	}

	sendRawTransaction = async (raw: string) => {
		try {
			const resp = await this._net.http(
				"POST",
				"transactions",
				{
					body: { raw: raw },
					validateResponseHeader: this._headerValidator
				}
			);
			return resp.id;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	getCode = async (addr: string, revision?: string) => {
		try {
			const httpParams: Net.Params = {
				validateResponseHeader: this._headerValidator
			}
			if (revision) {
				httpParams.query = { "revision": revision };
			}
			const code: Connex.Thor.Account.Code = await this._net.http(
				"GET",
				`accounts/${addr}/code`,
				httpParams
			);

			return code.code;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	getBalance = async (addr: string, revision?: string) => {
		try {
			const httpParams: Net.Params = {
				validateResponseHeader: this._headerValidator
			}
			if (revision) {
				httpParams.query = { "revision": revision };
			}
			const acc: Connex.Thor.Account = await this._net.http(
				"GET",
				`accounts/${addr}`,
				httpParams
			);

			return acc.balance;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	getStorageAt = async (addr: string, key: string, revision?: string) => {
		try {
			const httpParams: Net.Params = {
				validateResponseHeader: this._headerValidator
			}
			if (revision) {
				httpParams.query = { "revision": revision };
			}
			const storage: Connex.Thor.Account.Storage = await this._net.http(
				"GET",
				`accounts/${addr}/storage/${key}`,
				httpParams
			);

			return storage.value;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}

	call = async (callObj: ExplainArg, revision?: string) => {
		try {
			const httpParams: Net.Params = {
				body: callObj,
				validateResponseHeader: this._headerValidator
			}
			if (revision) {
				httpParams.query = { "revision": revision };
			}
			const outputs: Connex.VM.Output[] = await this._net.http(
				"POST",
				`accounts/*`,
				httpParams
			);

			const output = outputs[0];
			if (output.reverted) {
				const err = {
					data: getErrMsg(output),
					message: output?.revertReason || output.vmError
				}
				return Promise.reject(err);
			}
			return output.data;
		} catch (err: any) {
			return Promise.reject(err);
		}
	}
}