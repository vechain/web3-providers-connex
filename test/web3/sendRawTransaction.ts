'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ConnexProvider, ThorSigner, RetReceipt } from '../../src/index';
import { randAddr } from '../../src/utils';
import { urls, soloAccounts } from '../settings';
import { BigNumber, ethers } from 'ethers';
const Web3 = require('web3');

describe('Testing sendRawTransaction', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(pk => { wallet.import(pk); })

	let driver: Driver;
	let provider: ConnexProvider;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ConnexProvider(new Framework(driver), net);
			web3 = new Web3(provider);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('transfer value', async () => {
		const signer = new ThorSigner(new ethers.providers.Web3Provider(provider), wallet);

		const raw = await signer.signTransaction({
			from: wallet.list[0].address,
			to: randAddr(),
			value: BigNumber.from('1' + '0'.repeat(18)).toHexString()
		})

		try {
			const r1: RetReceipt = await web3.eth.sendSignedTransaction(raw);
			const r2: RetReceipt = await web3.eth.getTransactionReceipt(r1.transactionHash);
			expect(r1).to.eql(r2);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})