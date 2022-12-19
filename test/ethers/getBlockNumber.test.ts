'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers } from 'ethers';
import * as thor from '../../src/index';
import { urls } from '../settings';

describe('Testing getBlockNumber', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let provider: ethers.providers.Web3Provider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ethers.providers.Web3Provider(
				new thor.Provider({connex: new Framework(driver)})
			);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('get the latest block number', async () => {
		try {
			const num = await provider.getBlockNumber();
			expect(num > 0).to.be.true;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})