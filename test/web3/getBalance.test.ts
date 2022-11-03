'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ConnexProvider, Err } from '../../src/index';
import { urls } from '../settings';
import { toHex } from '../../src/utils'

describe('Testing getBalance', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let web3: any;
	let connex: Connex;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			connex = new Framework(driver);
			web3 = new Web3(new ConnexProvider({ connex: connex }));
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
		const expectedErr = Err.MethodParamNotSupported('eth_getBalance', 2);
		try {
			await web3.eth.getBalance(addr, opt);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr.message);
		}
	})

	it('valid call', async () => {
		let balance: string;
		try {
			balance = await web3.eth.getBalance(addr, 'latest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		const expectedBalance = (await connex.thor.account(addr).get()).balance;

		expect(toHex(balance)).to.eql(expectedBalance);

		try {
			balance = await web3.eth.getBalance(addr);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		expect(toHex(balance)).to.eql(expectedBalance);
	})
})