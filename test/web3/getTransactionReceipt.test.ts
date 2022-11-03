'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ConnexProvider, types } from '../../src/index';
import { urls } from '../settings';
import { zeroBytes20, zeroBytes256 } from '../../src/common';

describe('Testing getTransactionReceipt', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let web3: any;
	let connex: Connex;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			connex = new Framework(driver);
			web3 = new Web3(new ConnexProvider({
				connex: connex,
			}));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('non-existing', async () => {
		const hash = '0x' + '0'.repeat(64);
		let receipt: types.RetReceipt;
		try {
			receipt = await web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(receipt).to.be.null;
	})

	it('without log', async () => {
		const hash = '0xc5e0da1aedd7e194b49e8e72977affb3737c335a1d2c385c49a7510cc2fc4928';

		let receipt: types.RetReceipt;
		try {
			receipt = await web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		const expectedReceipt = await connex.thor.transaction(hash).getReceipt();
		if (expectedReceipt === null) {
			assert.fail('Receipt not found');
		}

		expect(receipt.blockHash).to.eql(expectedReceipt.meta.blockID);
		expect(receipt.blockNumber).to.eql(expectedReceipt.meta.blockNumber);
		expect(receipt.transactionHash).to.eql(expectedReceipt.meta.txID);
		expect(receipt.logs.length).to.eql(0);
		expect(receipt.status).to.eql(!expectedReceipt.reverted);

		expect(receipt.contractAddress).to.be.null;

		// Unsupported fields
		expect(receipt.transactionIndex).to.eql(0);
		expect(receipt.cumulativeGasUsed).to.eql(0);
		expect(receipt.from).to.eql(zeroBytes20);
		expect(receipt.to).to.eql(zeroBytes20);
		expect(receipt.logsBloom).to.eql(zeroBytes256);
	})

	it('with log', async () => {
		const hash = '0xe50017fb80165941a7501a845d20822a6b573bd659d8310a1ba8b6f7308cf634';

		let receipt: types.RetReceipt;
		try {
			receipt = await web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		const expectedReceipt = await connex.thor.transaction(hash).getReceipt();
		if (expectedReceipt === null) {
			assert.fail('Receipt not found');
		}

		receipt.logs.forEach((log, index) => {
			expect(log.blockHash).to.eql(expectedReceipt.meta.blockID);
			expect(log.blockNumber).to.eql(expectedReceipt.meta.blockNumber);
			expect(log.transactionHash).to.eql(expectedReceipt.meta.txID);
			expect(log.address).to.eql(web3.utils.toChecksumAddress(
				expectedReceipt.outputs[0].events[index].address));
			expect(log.topics).to.eql(expectedReceipt.outputs[0].events[index].topics);
			expect(log.data).to.eql(expectedReceipt.outputs[0].events[index].data);

			// Unsupported fields
			expect(log.transactionIndex).to.eql(0);
			expect(log.logIndex).to.eql(0);
		})
	})
})