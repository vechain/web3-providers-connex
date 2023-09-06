'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3 } from '../../src/index';
import { randAddr } from '../../src/utils';

describe('Testing function sendTransaction', function () {
	before(async function (){
		const { eip1193Providers } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.solo));
	})

	it('Should return the same receipt as the one obtained from calling getTransactionReceipt', async function () {
		const { wallet } = this.testObject as TestObject;

		const txObj = {
			from: wallet.list[0].address,
			to: randAddr(),
			value: '1' + '0'.repeat(18),
			gas: 30000,
		}

		try {
			const r1 = await this.web3.eth.sendTransaction(txObj);
			const r2 = await this.web3.eth.getTransactionReceipt(r1.transactionHash);
			expect(r1).to.eql(r2);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})