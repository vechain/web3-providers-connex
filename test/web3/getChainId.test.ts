'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3 } from '../../src/index';

describe('Testing function getChainId', function () {
	before(async function (){
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
		this.connex = connexs.main;
	})


	it('Should return the correct mainnet chainTag', async function () {
		const tag = 74n;
		let id: bigint;

		try {
			id = await this.web3.eth.getChainId();
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(id).to.eql(tag);
	})
})