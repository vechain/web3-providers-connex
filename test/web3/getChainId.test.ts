'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3 } from '../../src/index';

describe('Testing function getChainId', function () {
	before(async function () {
		const { eip1193Providers } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.main));
	})
	
	it('get mainnet genesis Id', async function() {
		const tag: string = "0x851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a";

		try {
			this.web3.extend({
				property: 'eth',
				methods: [{
					name: 'getChainId',
					call: 'eth_chainId',
					params: 0,
				}]
			});

			let res = await this.web3.eth.getChainId();
			expect("0x" + res.toString(16)).to.eql(tag);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})
