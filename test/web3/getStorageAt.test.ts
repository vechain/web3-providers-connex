'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3, ErrMsg } from '../../src/index';

describe('Testing function getStorageAt', function () {
	before(async function (){
		const { eip1193Providers } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
	})

	const addr = '0xBe7a61b0405FDfbAaE28c1355cD53c8affC1C4b0';

	it('Should return error when the input option not supported', async function () {
		const opt = 'earliest';
		const expectedErr = ErrMsg.MethodParamNotSupported('eth_getStorageAt', 3);
		try {
			await this.web3.eth.getStorageAt(addr, 0, opt);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr);
		}
	})

	it('Should return the correct storage values', async function () {
		const tests: { key: number | string, expected: string }[] = [
			{ key: 1, expected: '0x0000000000000000000000007092bed3954d4702a868a0d968c6aba3fc87eabd' },
			{ key: '0x' + '0'.repeat(63) + '1', expected: '0x0000000000000000000000007092bed3954d4702a868a0d968c6aba3fc87eabd' },
			{ key: '0x' + 'f'.repeat(64), expected: '0x' + '0'.repeat(64) },
			{ key: 2 ** 64, expected: '0x' + '0'.repeat(64) },
		]

		for (const t of tests) {
			let value: string;
			try {
				value = await this.web3.eth.getStorageAt(addr, t.key);
			} catch (err: any) {
				assert.fail(`Unexpected error: ${err}`);
			}

			expect(value).to.eql(t.expected);
		}
	})
})