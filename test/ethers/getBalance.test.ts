'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { BigNumber, ethers } from 'ethers';

import * as thor from '../../src/index';
import { urls } from '../settings'

describe('Testing getBalance', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let provider: ethers.providers.Web3Provider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ethers.providers.Web3Provider(
				new thor.ProviderEthers({connex: new Framework(driver)})
			);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	const addr = '0x69Cba4e17FEB8DA7Bd24EA36aabafE53a0f76439';

	it('option not supported', async () => {
		const opt = 'earliest';
		const expectedErr = thor.ErrMsg.MethodParamNotSupported('eth_getBalance', 2);
		try {
			await provider.getBalance(addr, opt);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr);
		}
	})

	it('valid call', async () => {
		const expectedBalance = '156' + '0'.repeat(16);
		let balance: BigNumber;
		try {
			balance = await provider.getBalance(addr, 'latest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(balance.toString()).to.eql(expectedBalance);

		try {
			balance = await provider.getBalance(addr);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		expect(balance.toString()).to.eql(expectedBalance);
	})
})