'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ConnexProvider } from '../src/index';
import { urls } from './settings'
import { Err } from '../src/error';

describe('Testing getBalance', () => {
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

	const addr = '0x69Cba4e17FEB8DA7Bd24EA36aabafE53a0f76439';

	it('option not supported', async () => {
		const opt = 'earliest';
		const expectedErr = Err.MethodParamNotSupported('eth_getBalance', 2);
		try {
			await web3.eth.getBalance(addr, opt);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr.message);
		}
	})

	it('valid call', async () => {
		const expectedBalance = '156' + '0'.repeat(16);
		let balance: string;
		try {
			balance = await web3.eth.getBalance(addr, 'latest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(balance).to.eql(expectedBalance);
		
		try {
			balance = await web3.eth.getBalance(addr);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		expect(balance).to.eql(expectedBalance);
	})
})