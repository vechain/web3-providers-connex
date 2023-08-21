'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from './testSetup';
import { BrowserProvider } from 'ethers';
import { modifyProvider } from '../../src/ethers';

describe('Testing function getBlockNumber', function () {
	before(function () {
		const { eip1193Providers } = this.testObject as TestObject;
		this.provider = modifyProvider(new BrowserProvider(eip1193Providers.main));
	})

	it('should return a positive block number when querying the latest block', async function () {
		try {
			const num = await this.provider.getBlockNumber();
			expect(num > 0).to.be.true;
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})