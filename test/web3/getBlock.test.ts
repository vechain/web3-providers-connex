'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3, ErrMsg, types } from '../../src/index';
import { zeroBytes32, zeroBytes256 } from '../../src/common';

describe('Testing function getBlock', function () {
	before(async function (){
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
		this.connex = connexs.main;
	})

	it('Should return error when passing a non-existing block hash', async function () {
		const hash = '0x' + '0'.repeat(64);
		try {
			const blk = await this.web3.eth.getBlock(hash);
			expect(blk).to.be.null;
		} catch (err: any) {
			assert.fail(`UnexpectedBlock error: ${err}`);
		}
	})

	it('Should return error when passing a non-existing block number', async function () {
		const num = 2 ** 32 - 1;
		try {
			const blk = await this.web3.eth.getBlock(num);
			expect(blk).to.be.null;
		} catch (err: any) {
			assert.fail(`UnexpectedBlock error: ${err}`);
		}
	})

	it('Should return error when querying a pending block', async function () {
		const expectedBlockErr = ErrMsg.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockNumber');
		try {
			await this.web3.eth.getBlock('pending');
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedBlockErr);
		}
	})

	it('Should return the correct block when passing an existing block hash/id', async function () {
		const hash = '0x00af11f1090c43dcb9e23f3acd04fb9271ac08df0e1303711a851c03a960d571';
		const num = 11473393n;
		const txs = ['0xf0d4f159a54650cecb19ae51acee042a73e038ff398a9af8288579aada4eee16'];

		let blk: types.RetBlock;
		try {
			blk = await this.web3.eth.getBlock(hash);
		} catch (err: any) {
			assert.fail(err.message || err);
		}

		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);
		expect(blk.transactions).to.eql(txs);

		// Unsupported fields
		expect(blk.difficulty).to.eql(0n);
		expect(blk.totalDifficulty).to.eql(0n);
		expect(blk.extraData).to.eql('0x');
		expect(blk.logsBloom).to.eql(zeroBytes256);
		expect(blk.sha3Uncles).to.eql(zeroBytes32);
		expect(blk.nonce).to.eql(0n);
		expect(blk.uncles).to.eql([]);
	})

	it('Should return the correct block when passing an existing block number', async function () {
		const hash = '0x00af11f1090c43dcb9e23f3acd04fb9271ac08df0e1303711a851c03a960d571';
		const num = 11473393n;

		let blk: types.RetBlock;
		try {
			blk = await this.web3.eth.getBlock(num);
		} catch (err: any) {
			assert.fail(`UnexpectedBlock error: ${err}`);
		}

		expect(blk.hash).to.eql(hash);
		expect(blk.number).to.eql(num);
	})

	it('Should return the latest block', async function () {
		try {
			await this.web3.eth.getBlock('latest');
		} catch (err: any) {
			assert.fail(`UnexpectedBlock error: ${err}`);
		}
	})

	it('Should return the genesis block', async function () {
		const genesisId = '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a';
		let blk: types.RetBlock;
		try {
			blk = await this.web3.eth.getBlock('earliest');
		} catch (err: any) {
			assert.fail(`UnexpectedBlock error: ${err}`);
		}
		expect(blk.hash).to.eql(genesisId);
		expect(blk.number).to.eql(0n);
	})
})