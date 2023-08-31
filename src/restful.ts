'use strict';

import { ErrCode } from './error';
import { Net, ExplainArg, TraceClauseOption, TraceCallOption } from './types';
import { decodeRevertReason, getErrMsg } from './utils';
import { ProviderRpcError } from './eip1193';

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
			return Promise.reject({
				code: ErrCode.Default,
				message: getErrMsg(err)
			});
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
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
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
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
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
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
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
				if (output.vmError === 'execution reverted') {
					const reason = decodeRevertReason(output.data)

					return Promise.reject(new ProviderRpcError(ErrCode.Default,
						reason ? `execution reverted: ${reason}` : output.vmError,
						output.data
					))
				} else {
					return Promise.reject(new ProviderRpcError(ErrCode.Default, output.vmError))
				}
			}
			
			return output.data;
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	traceClause = async (opts: TraceClauseOption) =>{
		try {
			const httpParams: Net.Params = {
				body: opts,
				validateResponseHeader: this._headerValidator
			}

			const ret: object = await this._net.http(
				"POST",
				'debug/tracers',
				httpParams
			);

			
			return ret;
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}

	traceCall = async (opts: TraceCallOption, revision?: string) => {
		try {
			const httpParams: Net.Params = {
				body: opts,
				validateResponseHeader: this._headerValidator
			}
			if (revision) {
				httpParams.query = { "revision": revision };
			}

			const ret: object = await this._net.http(
				"POST",
				'debug/tracers/call',
				httpParams
			);

			
			return ret;
		} catch (err: any) {
			return Promise.reject(new ProviderRpcError(ErrCode.InternalError, getErrMsg(err)));
		}
	}
}