'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers } from 'ethers';

import * as thor from '../../src';
import { urls } from '../settings';

describe('Testing getTransaction', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let connex: Connex;
	let cp: thor.ConnexProvider;
	let provider: ethers.providers.JsonRpcProvider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			connex = new Framework(driver)
			cp = new thor.ConnexProvider({ connex: connex });
			provider = new ethers.providers.Web3Provider(cp);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('non-existing hash/id', async () => {
		const hash = '0x' + '0'.repeat(64);
		try {
			const tx = await provider.getTransaction(hash);
			expect(tx).to.be.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('existing hash/id of a contract call', async () => {
		const hash = '0xe50017fb80165941a7501a845d20822a6b573bd659d8310a1ba8b6f7308cf634';

		let actual: ethers.providers.TransactionResponse;
		let expected: thor.types.RetTransaction;
		try {
			actual = await provider.getTransaction(hash);
			expected = await cp.request({
				method: 'eth_getTransactionByHash',
				params: [hash]
			})
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		const expectedTx = await connex.thor.transaction(hash).get();

		if (expectedTx === null) {
			assert.fail('Tx not found');
		}

		expect(actual.hash).to.eql(expectedTx.id);
		expect(actual.blockNumber).to.eql(expectedTx.meta.blockNumber);
		expect(actual.blockHash).to.eql(expectedTx.meta.blockID);
		expect(actual.from.toLowerCase()).to.eql(
			expectedTx.origin.toLowerCase()
		);

		expect(actual.to!.toLowerCase()).to.eql(expected.to!.toLowerCase());
		expect(actual.data).to.eql(expected.input);
		expect(actual.value.toNumber()).to.eql(parseInt(expected.value));
		expect(actual.gasLimit.toNumber()).to.eql(parseInt(expected.gas, 16));

		// Unsupported fields
		expect(actual.nonce).to.eql(0);
	})

	it('existing hash/id of a VET transfer', async () => {
		const hash = '0xc5e0da1aedd7e194b49e8e72977affb3737c335a1d2c385c49a7510cc2fc4928';

		let actual: ethers.providers.TransactionResponse;
		let expected: thor.types.RetTransaction;
		try {
			actual = await provider.getTransaction(hash);
			expected = await cp.request({
				method: 'eth_getTransactionByHash',
				params: [hash]
			})
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(actual.data).to.eql(expected.input);
		expect(actual.value.toHexString()).to.eql(expected.value);
	})
})