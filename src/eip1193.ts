export interface RequestArguments {
	method: string;
	params?: Array<any>;
}

export interface IProvider {
	request(args: RequestArguments): Promise<any>
}

export interface Subscription {
	type: 'eth_subscription';
	data: {
		subscription: string;
		result: any;
	};
}

export class ProviderRpcError extends Error {
	code: number;
	data?: any;

	constructor(code: number, message?:string, data?:any) {
		super(message);
		this.code = code;
		this.data = data;
	}
}

export interface ProviderConnectInfo {
	chainId: string;
}