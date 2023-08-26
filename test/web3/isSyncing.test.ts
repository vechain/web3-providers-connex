'use strict';

import 'mocha';
import { assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3 } from '../../src/index';

describe('Testing function isSyncing', function () {
	before(async function (){
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
		this.connex = connexs.main;
	})

	it('Should return the current block number and highest block number', async function () {
		let ret: any;
		try {
			ret = await this.web3.eth.isSyncing();
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		if (typeof ret === 'boolean') {
			assert.isFalse(ret, 'Only false returned for boolean value');
		} else {
			assert.isTrue(
				!!ret.currentBlock && typeof ret.currentBlock === 'number'
				&& !!ret.highestBlock && typeof ret.currentBlock === 'number'
			);
		}
	})
})