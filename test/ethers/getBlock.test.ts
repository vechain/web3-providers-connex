'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { ErrMsg } from '../../src/error';
import { RetBlock } from '../../src/types';
import { TestObject } from './testSetup';
import { BrowserProvider, Block } from 'ethers';
import { modifyProvider } from '../../src/ethers';

describe('Testing function getBlock', function () {
	before(function () {
		const { eip1193Providers } = this.testObject as TestObject;
		this.provider = modifyProvider(new BrowserProvider(eip1193Providers.main));
	})

	it('should return null when passing a non-existing block hash', async function () {
		const hash = '0x' + '0'.repeat(64);
		try {
			const blk = await this.provider.getBlock(hash);
			expect(blk).to.be.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('should return null when passing a non-existing block number', async function () {
		const num = 2 ** 32 - 1;
		try {
			const blk = await this.provider.getBlock(num);
			expect(blk).to.be.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('should return error when querying a pending block', async function () {
		const expectedErr = ErrMsg.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockNumber');
		try {
			await this.provider.getBlock('pending');
			assert.fail();
		} catch (err: any) {
			assert.ok(err.message.includes(expectedErr));
		}
	})

	it('should return the correct block info when passing an existing block hash', async function () {
		const hash = '0x00af11f1090c43dcb9e23f3acd04fb9271ac08df0e1303711a851c03a960d571';
		const num = 11473393;

		let blk: Block;
		let expected: RetBlock;
		try {
			blk = await this.provider.getBlock(hash);
			const eip1193 = this.testObject.eip1193Providers.main;
			expected = await eip1193.request({ method: 'eth_getBlockByHash', params: [hash] });
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);
		expect(blk.hash).to.eql(expected.hash);
		expect(blk.parentHash).to.eql(expected.parentHash);
	})

	it('should return the correct block info when passing an existing block number', async function () {
		const hash = '0x00af11f1090c43dcb9e23f3acd04fb9271ac08df0e1303711a851c03a960d571';
		const num = 11473393;

		let blk: Block;
		try {
			blk = await this.provider.getBlock(num);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);
	})

	it('should return a non-null block when querying the latest block', async function () {
		try {
			const blk = await this.provider.getBlock('latest');
			expect(blk).to.be.not.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('should return the correct genesis block info when querying the earliest block', async function () {
		const genesisId = '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a';
		let blk: Block;
		try {
			blk = await this.provider.getBlock('earliest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		expect(blk.hash).to.eql(genesisId);
		expect(blk.number).to.eql(0);
	})
})