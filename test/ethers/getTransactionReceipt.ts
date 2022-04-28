'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers } from 'ethers';
import { ConnexProvider, types } from '../../src';
import { urls } from '../settings';
import { CONST } from '../../src/types';

describe('Testing getTransactionReceipt', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let cp: ConnexProvider;
	let provider: ethers.providers.Web3Provider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			cp = new ConnexProvider({ 
				connex: new Framework(driver),
				ifReturnThorObj: true,
			});
			provider = new ethers.providers.Web3Provider(cp);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('non-existing', async () => {
		const hash = '0x' + '0'.repeat(64);
		try {
			const receipt = await provider.getTransactionReceipt(hash);
			expect(receipt).to.be.null;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})

	it('without log', async () => {
		const hash = '0xc5e0da1aedd7e194b49e8e72977affb3737c335a1d2c385c49a7510cc2fc4928';

		let receipt: ethers.providers.TransactionReceipt;
		let expected: types.RetReceipt;
		try {
			receipt = await provider.getTransactionReceipt(hash);
			expected = await cp.request({
				method: 'eth_getTransactionReceipt',
				params: [hash]
			});
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		if (!expected.thor) {
			assert.fail('thor undefined');
		}

		expect(receipt.blockHash).to.eql(expected.thor.meta.blockID);
		expect(receipt.blockNumber).to.eql(expected.thor.meta.blockNumber);
		expect(receipt.transactionHash).to.eql(expected.thor.meta.txID);
		expect(receipt.logs.length).to.eql(0);
		expect(!!receipt.status).to.eql(!expected.thor.reverted);

		expect(receipt.contractAddress).to.be.null;

		// Unsupported fields
		expect(receipt.transactionIndex).to.eql(0);
		expect(receipt.cumulativeGasUsed.toNumber()).to.eql(0);
		expect(receipt.from).to.eql(CONST.zeroAddress);
		expect(receipt.to).to.eql(CONST.zeroAddress);
	})

	it('with log', async () => {
		const hash = '0xe50017fb80165941a7501a845d20822a6b573bd659d8310a1ba8b6f7308cf634';

		let actual: ethers.providers.TransactionReceipt;
		let expected: types.RetReceipt;
		try {
			actual = await provider.getTransactionReceipt(hash);
			expected = await cp.request({
				method: 'eth_getTransactionReceipt',
				params: [hash]
			});
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		actual.logs.forEach((log, index) => {
			if (!expected.thor) {
				assert.fail('thor undefined');
			}

			expect(log.blockHash).to.eql(expected.thor.meta.blockID);
			expect(log.blockNumber).to.eql(expected.thor.meta.blockNumber);
			expect(log.transactionHash).to.eql(expected.thor.meta.txID);
			expect(log.address.toLowerCase()).to.eql(
				expected.thor.outputs[0].events[index].address.toLowerCase()
			);
			expect(log.topics).to.eql(expected.thor.outputs[0].events[index].topics);
			expect(log.data).to.eql(expected.thor.outputs[0].events[index].data);

			// Unsupported fields
			expect(log.transactionIndex).to.eql(0);
			expect(log.logIndex).to.eql(0);
		})
	})
})