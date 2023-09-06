'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3, types } from '../../src/index';

describe('Testing function getTransaction', function () {
	before(async function (){
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
		this.connex = connexs.main;
	})

	it('Should return error when passing a non-existing tx hash/id', async function () {
		const hash = '0x' + '0'.repeat(64);
		try {
			await this.web3.eth.getTransaction(hash);
		} catch (err: any) {
			assert.ok(err.message.includes('Transaction not found'));
		}
	})

	it('Should return the correct info when passing an existing hash/id of a contract call', async function () {
		const hash = '0xe50017fb80165941a7501a845d20822a6b573bd659d8310a1ba8b6f7308cf634';
		const expected = {
			to: this.web3.utils.toChecksumAddress('0xC7FD71b05b3060FCE96E4B6cDc6eC353FA6F838e'),
			data: '0x53a636dd0000000000000000000000000000000000000000000000000000b37194492d2d0000000000000000000000000000000000000000000000233c8fe42703e8000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000003576f560000000000000000000000000000000000000000000000000000000000',

			gas: 201675,
			value: '0',
		}

		let tx: types.RetTransaction;
		try {
			tx = await this.web3.eth.getTransaction(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		const expectedReceipt = await this.connex.thor.transaction(hash).get();
		if (expectedReceipt === null) {
			assert.fail('Transaction not found');
		}

		expect(tx.hash).to.eql(expectedReceipt.id);
		expect(tx.blockNumber).to.eql(BigInt(expectedReceipt.meta.blockNumber));
		expect(tx.blockHash).to.eql(expectedReceipt.meta.blockID);
		expect(tx.from.toLowerCase()).to.eql(expectedReceipt.origin.toLowerCase());
		expect(tx.value).to.eql(BigInt(expected.value));
		expect(tx.gas).to.eql(BigInt(expected.gas));
		expect(tx.to?.toLowerCase()).to.eql(expected.to.toLowerCase());
		expect(tx.input).to.eql(expected.data);

		// Unsupported fields
		expect(tx.nonce).to.eql(0n);
	})

	it('Should return the correct when passing an existing hash/id of a VET transfer', async function () {
		const hash = '0xc5e0da1aedd7e194b49e8e72977affb3737c335a1d2c385c49a7510cc2fc4928';
		const expected = {
			value: this.web3.utils.hexToNumberString('0x12dd785c378bf00000'),
			data: '0x'
		}

		let tx: types.RetTransaction;
		try {
			tx = await this.web3.eth.getTransaction(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(tx.input).to.eql(expected.data);
		expect(tx.value).to.eql(BigInt(expected.value));
	})
})