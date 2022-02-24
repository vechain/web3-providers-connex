'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ConnexProvider } from '../src/index';
import { urls } from './settings'
import { RetTransaction } from '../src/types';
import { Err } from '../src/error';

describe('Testing getTransaction', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();
	// wallet.import(soloAccounts[0]);

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ConnexProvider(new Framework(driver)));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('non-existing hash/id', async () => {
		const hash = '0x' + '0'.repeat(64);
		const expectedErr = Err.TransactionNotFound(hash);
		try {
			await web3.eth.getTransaction(hash);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr.message);
		}
	})

	it('existing hash/id of a contract call', async () => {
		const hash = '0xe50017fb80165941a7501a845d20822a6b573bd659d8310a1ba8b6f7308cf634';
		const expected = {
			to: web3.utils.toChecksumAddress('0xC7FD71b05b3060FCE96E4B6cDc6eC353FA6F838e'),
			data: '0x53a636dd0000000000000000000000000000000000000000000000000000b37194492d2d0000000000000000000000000000000000000000000000233c8fe42703e8000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000003576f560000000000000000000000000000000000000000000000000000000000',

			thorNonce: '0xf2f3e8263ef8a12f',
			gas: 201675,
			value: '0',
		}

		let tx: RetTransaction;
		try {
			tx = await web3.eth.getTransaction(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(tx.id).to.eql(tx.hash);
		expect(tx.blockNumber).to.eql(tx.meta.blockNumber);
		expect(tx.blockHash).to.eql(tx.meta.blockID);
		expect(tx.from).to.eql(web3.utils.toChecksumAddress(tx.origin));
		expect(tx.nonce).to.be.null;

		expect(tx.thorNonce).to.eql(expected.thorNonce);
		expect(tx.to).to.eql(expected.to);
		expect(tx.input).to.eql(expected.data);
		expect(tx.value).to.eql(expected.value);
		expect(tx.gas).to.eql(expected.gas);
	})

	it('existing hash/id of a VET transfer', async () => {
		const hash = '0xc5e0da1aedd7e194b49e8e72977affb3737c335a1d2c385c49a7510cc2fc4928';
		const expected = {
			value: web3.utils.hexToNumberString('0x12dd785c378bf00000'),
			data: '0x'
		}

		let tx: RetTransaction;
		try {
			tx = await web3.eth.getTransaction(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(tx.input).to.eql(expected.data);
		expect(tx.value).to.eql(expected.value);
	})
})