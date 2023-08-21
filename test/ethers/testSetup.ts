import { soloAccounts, abi, bin, urls } from "../settings";
import { Provider } from "../../src/provider";
import { SimpleNet, SimpleWallet, Driver } from "@vechain/connex-driver";
import { Framework } from '@vechain/connex-framework';
import { assert } from 'chai';

export interface TestObject {
	wallet: SimpleWallet;
	urls: typeof urls;
	abi: typeof abi;
	bin: typeof bin;
	connexs: {main: Connex, solo: Connex};
	eip1193Providers: { main: Provider, solo: Provider };
	drivers: { main: Driver, solo: Driver };
}

before(async function () {
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => {
		wallet.import(key);
	});

	let providers: Provider[] = [];
	let drivers: Driver[] = [];
	let connexs: Connex[] = [];
	const networks = ['solo', 'main'];

	for (const network of networks) {
		const net = network === 'solo' ? new SimpleNet(urls.solo) : new SimpleNet(urls.mainnet);
		try {
			const driver = await Driver.connect(net, wallet);
			drivers.push(driver);
			connexs.push(new Framework(driver));
			providers.push(new Provider({
				connex: connexs[connexs.length - 1],
				wallet: wallet,
			}));
		} catch (err: any) {
			assert.fail(`Provider initialization failed on ${network}-net: ${err}`);
		}
	}

	this.testObject = new Object({
		wallet: wallet,
		urls: urls,
		abi: abi,
		bin: bin,
		connexs: { solo: connexs[0], main: connexs[1] },
		eip1193Providers: { solo: providers[0], main: providers[1] },
		drivers: { solo: drivers[0], main: drivers[1] },
	});
})

after(async function () {
	this.testObject.drivers.solo.close();
	this.testObject.drivers.main.close();
})