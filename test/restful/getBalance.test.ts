'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ConnexProvider } from '../../src/index';
import { urls, soloAccounts } from '../settings';
import { randAddr } from '../../src/utils';

describe('Testing getBalance', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => { wallet.import(key); })

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ConnexProvider({
				connex: new Framework(driver),
				net: net
			}));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('test revision', async () => {
		const to = randAddr();
		const val = '1' + '0'.repeat(18);

		try {
			await web3.eth.sendTransaction({
				from: wallet.list[0].address,
				to: to,
				value: val
			})

			const n = await web3.eth.getBlockNumber();

			let balance: string;
			balance = await web3.eth.getBalance(to, Math.floor(n / 2));
			expect(balance).to.eql('0');

			balance = await web3.eth.getBalance(to, 0, n);
			expect(balance).to.eql(val);
		} catch (err: any) {
			assert.fail(err);
		}
	});
})