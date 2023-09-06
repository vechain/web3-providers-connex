'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3, ErrMsg } from '../../src/index';

describe('Testing getBalance', function (){
	before(async function (){
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
		this.connex = connexs.main;
	})

	const addr = '0x69Cba4e17FEB8DA7Bd24EA36aabafE53a0f76439';

	it('Should return error when the input option is not supported', async function (){
		const opt = 'earliest';
		const expectedErr = ErrMsg.MethodParamNotSupported('eth_getBalance', 2);
		try {
			await this.web3.eth.getBalance(addr, opt);
			assert.fail();
		} catch (err: any) {
			expect(err.message).to.eql(expectedErr);
		}
	})

	it('Should return the correct balance', async function (){
		let balance: BigInt;
		try {
			balance = await this.web3.eth.getBalance(addr, 'latest');
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}

		const expectedBalance: string = (await this.connex.thor.account(addr).get()).balance;

		expect(balance.toString(16)).to.eql(expectedBalance.substring(2));

		try {
			balance = await this.web3.eth.getBalance(addr);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
		expect(balance.toString(16)).to.eql(expectedBalance.substring(2));;
	})
})