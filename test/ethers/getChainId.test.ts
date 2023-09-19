'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { modifyProvider } from '../../src/ethers';
import { BrowserProvider } from 'ethers';

describe('Testing getting chain id', function () {
	before(function () {
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.provider = modifyProvider(new BrowserProvider(eip1193Providers.main));
		this.connex = connexs.main;
		this.cp = eip1193Providers.main;
	})


	it('should return the correct mainnet genesis Id', async function () {
		const expected: string = "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a";

		try {
			let actual = await this.provider.getNetwork();
			let chainId = actual.chainId;
			
			expect(chainId).to.eq(BigInt(expected));

		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})