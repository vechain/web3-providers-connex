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

export interface ProviderRpcError {
	code: number;
	message: string;
	data?: any;
}

export interface ProviderConnectInfo {
	chainId: string;
}