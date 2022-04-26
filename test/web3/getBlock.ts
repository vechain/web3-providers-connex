'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
const Web3 = require('web3');

import { ConnexProvider, Err, types } from '../../src/index';
import { urls } from '../settings';

describe('Testing getBlock', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();
	// wallet.import(soloAccounts[0]);

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ConnexProvider({ 
				connex: new Framework(driver),
				ifReturnThorObj: true, 
			}));
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
			const blk = await web3.eth.getBlock(hash);
			expect(blk).to.be.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('non-existing number', async () => {
		const num = 2 ** 32 - 1;
		try {
			const blk = await web3.eth.getBlock(num);
			expect(blk).to.be.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('pending', async () => {
		const expectedErr = Err.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockNumber');
		try {
			await web3.eth.getBlock('pending');
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr.message);
		}
	})

	it('existing hash/id', async () => {
		const hash = '0x00af11f1090c43dcb9e23f3acd04fb9271ac08df0e1303711a851c03a960d571';
		const num = 11473393;

		let blk: types.RetBlock;
		try {
			blk = await web3.eth.getBlock(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		if (!blk.thor) {
			assert.fail('thor undefined');
		}

		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);
		expect(blk.hash).to.eql(blk.thor.id);
		expect(blk.parentHash).to.eql(blk.thor.parentID);
	})

	it('existing number', async () => {
		const hash = '0x00af11f1090c43dcb9e23f3acd04fb9271ac08df0e1303711a851c03a960d571';
		const num = 11473393;

		let blk: types.RetBlock;
		try {
			blk = await web3.eth.getBlock(num);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);
	})

	it('latest', async () => {
		try {
			await web3.eth.getBlock('latest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('earliest', async () => {
		const genesisId = '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a';
		let blk: types.RetBlock;
		try {
			blk = await web3.eth.getBlock('earliest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		expect(blk.hash).to.eql(genesisId);
		expect(blk.number).to.eql(0);
	})
})