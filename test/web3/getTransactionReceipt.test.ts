'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3, types } from '../../src/index';
import { zeroBytes256 } from '../../src/common';

describe('Testing function getTransactionReceipt', function () {
	before(async function (){
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
		this.connex = connexs.main;
	})

	it('Should return error when passing a non-existing tx hash/id', async function () {
		const hash = '0x' + '0'.repeat(64);
		try {
			await this.web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.ok(err.message.includes('Transaction not found'));
		}
	})

	it('Should return the correct receipt of a tx that does not generate any log', async function () {
		const hash = '0xc5e0da1aedd7e194b49e8e72977affb3737c335a1d2c385c49a7510cc2fc4928';
		const from = '0xa3531B5E9725e232f49d5b4F40D93379a8F99b24';
		const to = '0x5734D36696DFE9A9109f03c2b45b6B5E8ecE5aC6';

		let receipt: types.RetReceipt;
		try {
			receipt = await this.web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		const expectedReceipt = await this.connex.thor.transaction(hash).getReceipt();
		if (expectedReceipt === null) {
			assert.fail('Receipt not found');
		}

		expect(receipt.blockHash).to.eql(expectedReceipt.meta.blockID);
		expect(receipt.blockNumber).to.eql(BigInt(expectedReceipt.meta.blockNumber));
		expect(receipt.transactionHash).to.eql(expectedReceipt.meta.txID);
		expect(receipt.logs.length).to.eql(0);
		expect(!!receipt.status).to.eql(!expectedReceipt.reverted);
		expect(receipt.from.toLowerCase()).to.eql(from.toLowerCase());
		if(receipt.to){
			expect(receipt.to.toLowerCase()).to.eql(to.toLowerCase());
		} else {
			assert.fail('Invalid receipt.to');
		}
		assert.ok(receipt.contractAddress === undefined);

		// Unsupported fields
		expect(receipt.cumulativeGasUsed).to.eql(0n);
		expect(receipt.logsBloom).to.eql(zeroBytes256);
	})

	it('Should return the correct receipt of a tx that generates logs', async function () {
		const hash = '0xe50017fb80165941a7501a845d20822a6b573bd659d8310a1ba8b6f7308cf634';

		let receipt: types.RetReceipt;
		try {
			receipt = await this.web3.eth.getTransactionReceipt(hash);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		const expectedReceipt = await this.connex.thor.transaction(hash).getReceipt();
		if (expectedReceipt === null) {
			assert.fail('Receipt not found');
		}

		receipt.logs.forEach((log, index) => {
			expect(log.blockHash).to.eql(expectedReceipt.meta.blockID);
			expect(log.blockNumber).to.eql(BigInt(expectedReceipt.meta.blockNumber));
			expect(log.transactionHash).to.eql(expectedReceipt.meta.txID);
			expect(log.address).to.eql(expectedReceipt.outputs[0].events[index].address.toLowerCase());
			expect(log.topics).to.eql(expectedReceipt.outputs[0].events[index].topics);
			expect(log.data).to.eql(expectedReceipt.outputs[0].events[index].data);
		})
	})
})