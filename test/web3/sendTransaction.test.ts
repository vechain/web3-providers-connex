'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ProviderWeb3, types } from '../../src/index';
import { randAddr } from '../../src/utils';
import { urls, soloAccounts } from '../settings'

describe('Testing sendTransaction', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => {
		wallet.import(key);
	});

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

	it('transfer value', async () => {
		const txObj = {
			from: wallet.list[0].address,
			to: randAddr(),
			value: '1' + '0'.repeat(18),
			gas: 30000,
		}

		try {
			const r1: types.RetReceipt = await web3.eth.sendTransaction(txObj);
			const r2: types.RetReceipt = await web3.eth.getTransactionReceipt(r1.transactionHash);
			expect(r1).to.eql(r2);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})