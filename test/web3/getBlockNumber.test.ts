'use strict';

import 'mocha';
import { assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3 } from '../../src/index';

describe('Testing function getBlockNumber', function () {
	before(async function (){
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
		this.connex = connexs.main;
	})

	it('Shoudl return the latest block number', async function () {
		try {
			await this.web3.eth.getBlockNumber();
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})