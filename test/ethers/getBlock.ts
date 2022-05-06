'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers } from 'ethers';

import * as thor from '../../src/index';
import { urls } from '../settings'

describe('Testing getBlock', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let cp: thor.ConnexProvider;
	let provider: ethers.providers.Web3Provider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			cp = new thor.ConnexProvider({ connex: new Framework(driver) });
			provider = new ethers.providers.Web3Provider(cp);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('non-existing hash', async () => {
		const hash = '0x' + '0'.repeat(64);
		try {
			const blk = await provider.getBlock(hash);
			expect(blk).to.be.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('non-existing number', async () => {
		const num = 2 ** 32 - 1;
		try {
			const blk = await provider.getBlock(num);
			expect(blk).to.be.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('pending', async () => {
		const expectedErr = thor.Err.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockNumber');
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
		let expected: thor.types.RetBlock;
		try {
			blk = await provider.getBlock(hash);
			expected = await cp.request({ method: 'eth_getBlockByHash', params: [hash] });
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);

		if (!!expected.thor) {
			expect(blk.hash).to.eql(expected.thor.id);
			expect(blk.parentHash).to.eql(expected.thor.parentID);
		}
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
			const blk = await provider.getBlock('latest');
			expect(!!blk.hash).to.be.true;
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