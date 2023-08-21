'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from './testSetup';
import { BrowserProvider } from 'ethers';
import { ErrMsg } from '../../src/error';
import { modifyProvider } from '../../src/ethers';

describe('Testing function getStorage', function () {
	before(function () {
		const { eip1193Providers } = this.testObject as TestObject;
		this.provider = modifyProvider(new BrowserProvider(eip1193Providers.main));
	})

	const addr = '0xBe7a61b0405FDfbAaE28c1355cD53c8affC1C4b0';

	it('should return error when querying at the earlier block height', async function () {
		const opt = 'earliest';
		const expectedErr = ErrMsg.MethodParamNotSupported('eth_getStorageAt', 3);
		try {
			await this.provider.getStorage(addr, 0, opt);
			assert.fail();
		} catch (err: any) {
			assert.ok(err.message.includes(expectedErr));
		}
	})

	it('should return the correct storage values when passing valid keys', async function () {
		const tests: { key: number | string, expected: string }[] = [
			{ key: 1, expected: '0x0000000000000000000000007092bed3954d4702a868a0d968c6aba3fc87eabd' },
			{ key: '0x' + '0'.repeat(63) + '1', expected: '0x0000000000000000000000007092bed3954d4702a868a0d968c6aba3fc87eabd' },
			{ key: '0x' + 'f'.repeat(64), expected: '0x' + '0'.repeat(64) },
			{ key: 2 ** 32, expected: '0x' + '0'.repeat(64) },
		]

		for (let i = 0; i < tests.length; i++) {
			let value: string;
			const t = tests[i];
			try {
				value = await this.provider.getStorage(addr, t.key);
			} catch (err: any) {
				assert.fail(`Unexpected error: ${err}`);
			}

			expect(value).to.eql(t.expected);
		}
	})
})