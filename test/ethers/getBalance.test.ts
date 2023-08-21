'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { ErrMsg } from '../../src/error';
import { TestObject } from './testSetup';
import { BrowserProvider } from 'ethers';
import { modifyProvider } from '../../src/ethers';
import { randAddr } from '../../src/utils';

describe('Testing function getBalance', function () {
	before(async function () {
		const { eip1193Providers, wallet } = this.testObject as TestObject;
		this.provider = modifyProvider(new BrowserProvider(eip1193Providers.solo));
		this.signer = await this.provider.getSigner(wallet.list[0].address);
		this.addr = randAddr();
	})

	it('should return error when querying balance at the previous block height', async function () {
		const opt = 'earliest';
		const expectedErr = ErrMsg.MethodParamNotSupported('eth_getBalance', 2);
		try {
			await this.provider.getBalance(this.addr, opt);
			assert.fail();
		} catch (err: any) {
			assert(err.message.includes(expectedErr), 'Unexpected error');
		}
	})

	it('should return the correct balance after receiving tokens', async function () {
		const expectedBalance = '156' + '0'.repeat(18);
		let balance: bigint;

		try {
			await this.signer.sendTransaction({
				to: this.addr,
				value: expectedBalance,
			});	
			balance = await this.provider.getBalance(this.addr, 'latest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		expect(balance.toString()).to.eql(expectedBalance);

		try {
			balance = await this.provider.getBalance(this.addr);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		expect(balance.toString()).to.eql(expectedBalance);
	})
})