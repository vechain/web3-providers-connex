'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers } from 'ethers';
import * as thor from '../../src/index';
import { urls } from '../settings';

describe('Testing getStorageAt', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let provider: ethers.providers.Web3Provider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ethers.providers.Web3Provider(
				new thor.ConnexProvider({ connex: new Framework(driver) })
			);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	const addr = '0xBe7a61b0405FDfbAaE28c1355cD53c8affC1C4b0';

	it('option not supported', async () => {
		const opt = 'earliest';
		const expectedErr = thor.Err.MethodParamNotSupported('eth_getStorageAt', 3);
		try {
			await provider.getStorageAt(addr, 0, opt);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr.message);
		}
	})

	it('test', async () => {
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
				value = await provider.getStorageAt(addr, t.key);
			} catch (err: any) {
				assert.fail(`Unexpected error: ${err}`);
			}

			expect(value).to.eql(t.expected);
		}
	})
})