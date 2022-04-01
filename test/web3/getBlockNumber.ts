'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
const Web3 = require('web3');

import { ConnexProvider } from '../../src/index';
import { urls } from '../settings';

describe('Testing getBlockNumber', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();
	// wallet.import(soloAccounts[0]);

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ConnexProvider({ connex: new Framework(driver) }));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('get the latest block number', async () => {
		try {
			await web3.eth.getBlockNumber();
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})