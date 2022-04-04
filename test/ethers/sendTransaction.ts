'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers, BigNumber } from 'ethers';

import { ConnexProvider, ethers as es, utils } from '../../src/index';
import { urls, soloAccounts } from '../settings'

describe('Testing sendTransaction', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => {
		wallet.import(key);
	});

	let driver: Driver;
	let cp: ConnexProvider;
	let provider: ethers.providers.JsonRpcProvider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			cp = new ConnexProvider({ connex: new Framework(driver) });
			provider = es.modifyProvider(new ethers.providers.Web3Provider(cp));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('transfer value', async () => {
		const from = wallet.list[0].address;
		const signer = provider.getSigner(from);

		let txResp: ethers.providers.TransactionResponse;
		try {
			txResp = await signer.sendTransaction({
				from: wallet.list[0].address,
				to: utils.randAddr(),
				value: BigNumber.from('1' + '0'.repeat(18)).toHexString()
			});
			const actual = await txResp.wait();
			const expected = await provider.getTransactionReceipt(actual.transactionHash);

			expect(actual).to.eql(expected);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})