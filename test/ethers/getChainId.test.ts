'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { modifyProvider } from '../../src/ethers';
import { BrowserProvider } from 'ethers';

describe('Testing function getTransaction', function () {
	before(function () {
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.provider = modifyProvider(new BrowserProvider(eip1193Providers.main));
		this.connex = connexs.main;
		this.cp = eip1193Providers.main;
	})


	it('get mainnet genesis Id', async function () {
		const expected: string = "0x851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a";

		try {
			let actual = await this.provider.getNetwork()
			let chainId = actual.chainId;
			
			expect("0x" + chainId.toString(16)).to.eq(expected)

		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})