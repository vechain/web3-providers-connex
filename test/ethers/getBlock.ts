'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { BigNumber, ethers } from 'ethers';

import { ConnexProvider } from '../../src/index';
import { urls } from '../settings'
import { Err } from '../../src/error';

describe('Testing getBlock', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();
	// wallet.import(soloAccounts[0]);

	let driver: Driver;
	let provider: ethers.providers.Web3Provider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ethers.providers.Web3Provider(new ConnexProvider(new Framework(driver)));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('non-existing hash', async () => {
		const hash = '0x' + '0'.repeat(64);
		try {
			await provider.getBlock(hash);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(Err.BlockNotFound(hash).message);
		}
	})

	it('non-existing number', async () => {
		const num = 2 ** 32 - 1;
		try {
			await provider.getBlock(num);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(Err.BlockNotFound(num).message);
		}
	})

	it('pending', async () => {
		const expectedErr = Err.BlockNotFound('pending');
		try {
			await provider.getBlock('pending');
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr.message);
		}
	})

	it('existing hash/id', async () => {
		const hash = '0x00af11f1090c43dcb9e23f3acd04fb9271ac08df0e1303711a851c03a960d571';
		const num = 11473393;

		let blk: ethers.providers.Block;
		try {
			blk = await provider.getBlock(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		
		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);
	})

	it('existing number', async () => {
		const hash = '0x00af11f1090c43dcb9e23f3acd04fb9271ac08df0e1303711a851c03a960d571';
		const num = 11473393;

		let blk: ethers.providers.Block;
		try {
			blk = await provider.getBlock(num);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);
	})

	it('latest', async () => {
		try {
			await provider.getBlock('latest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('earliest', async () => {
		const genesisId = '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a';
		let blk: ethers.providers.Block;
		try {
			blk = await provider.getBlock('earliest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		expect(blk.hash).to.eql(genesisId);
		expect(blk.number).to.eql(0);
	})
})