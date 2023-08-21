'use strict';

import 'mocha';
import { assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ProviderWeb3 } from '../../src/index';
import { urls } from '../settings';

describe('Testing getBlockNumber', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ProviderWeb3({ connex: new Framework(driver) }));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('get the latest block number', async () => {
		try {
			await web3.eth.getBlockNumber();
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})