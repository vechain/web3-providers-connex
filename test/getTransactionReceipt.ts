'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ConnexProvider } from '../src/index';
import { urls } from './settings'
import { RetReceipt } from '../src/types';

describe('Testing getBalance', () => {
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

	it('non-existing', async () => {
		const hash = '0x' + '0'.repeat(64);
		let receipt: RetReceipt;
		try {
			receipt = await web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(receipt).to.be.null;
	})

	it('without log', async () => {
		const hash = '0xc5e0da1aedd7e194b49e8e72977affb3737c335a1d2c385c49a7510cc2fc4928';
		
		let receipt: RetReceipt;
		try {
			receipt = await web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(receipt.blockHash).to.eql(receipt.meta.blockID);
		expect(receipt.blockNumber).to.eql(receipt.meta.blockNumber);
		expect(receipt.transactionHash).to.eql(receipt.meta.txID);
		expect(receipt.logs.length).to.eql(0);
		expect(receipt.status).to.eql(!receipt.reverted);

		expect(receipt.transactionIndex).to.be.null;
		expect(receipt.contractAddress).to.be.null;
		expect(receipt.cumulativeGasUsed).to.be.null;

		expect(receipt.from).to.be.null;
		expect(receipt.to).to.be.null;
	})

	it('with log', async() => {
		const hash = '0xe50017fb80165941a7501a845d20822a6b573bd659d8310a1ba8b6f7308cf634';
		
		let receipt: RetReceipt;
		try {
			receipt = await web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		receipt.logs.forEach((log, index) => {
			expect(log.blockHash).to.eql(receipt.meta.blockID);
			expect(log.blockNumber).to.eql(receipt.meta.blockNumber);
			expect(log.transactionHash).to.eql(receipt.meta.txID);
			expect(log.transactionIndex).to.be.null;

			expect(log.address).to.eql(web3.utils.toChecksumAddress(
				receipt.outputs[0].events[index].address));
			expect(log.topics).to.eql(receipt.outputs[0].events[index].topics);
			expect(log.data).to.eql(receipt.outputs[0].events[index].data);
		})
	})
})