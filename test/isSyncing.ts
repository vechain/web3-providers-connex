'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ConnexProvider } from '../src/index';
import { urls } from './settings'

describe('Testing isSyncing', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();
	// wallet.import(soloAccounts[0]);

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ConnexProvider(new Framework(driver)));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('call', async () => {
		let ret: any;
		try {
			ret = await web3.eth.isSyncing();
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		if (typeof ret === 'boolean') {
			assert.isFalse(ret, 'Only false returned for boolean value');
		} else {
			assert.isTrue(
				!!ret.currentBlock && typeof ret.currentBlock === 'number'
				&& !!ret.highestBlock && typeof ret.currentBlock === 'number'
			);
		}
	})
})