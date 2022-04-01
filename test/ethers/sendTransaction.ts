'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers, BigNumber } from 'ethers';

import { ConnexProvider, modifyProvider } from '../../src/index';
import { randAddr } from '../../src/utils';
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
			cp = new ConnexProvider({ connex: new Framework(driver), wallet: wallet, net: net });
			provider = modifyProvider(new ethers.providers.Web3Provider(cp));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('transfer value', async () => {
		const from = wallet.list[0].address;
		try {
			const r1 = await provider.getSigner(from).sendTransaction({
				from: wallet.list[0].address,
				to: randAddr(),
				value: BigNumber.from('1' + '0'.repeat(18)).toHexString()
			});
			const r2 = await provider.getTransactionReceipt(r1.hash);
			expect(r1).to.eql(r2);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})