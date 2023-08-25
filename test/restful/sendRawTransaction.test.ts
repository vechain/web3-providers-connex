'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ProviderWeb3, types, utils } from '../../src/index';
import { urls, soloAccounts } from '../settings';
import { Web3 } from 'web3';

describe('Testing sendRawTransaction', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(pk => { wallet.import(pk); })

	let driver: Driver;
	let provider: ProviderWeb3;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ProviderWeb3({ connex: new Framework(driver), net: net });
			web3 = new Web3(provider);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('transfer value', async () => {
		const raw = await utils.signTransaction({
			from: wallet.list[0].address,
			to: utils.randAddr(),
			value: '1' + '0'.repeat(18)
		}, wallet.list[0], provider)

		try {
			const r1: types.RetReceipt = await web3.eth.sendSignedTransaction(raw);
			const r2: types.RetReceipt = await web3.eth.getTransactionReceipt(r1.transactionHash);
			expect(r1).to.eql(r2);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})