'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3 } from '../../src/index';

describe('Testing function getChainId', function () {
	it('should return the correct mainnet genesis Id', async function() {
		const id: string = "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a";
		const { eip1193Providers } = this.testObject as TestObject;
		const web3 = new Web3(new ProviderWeb3(eip1193Providers.main));

		try {
			web3.extend({
				property: 'eth',
				methods: [{
					name: 'getChainId',
					call: 'eth_chainId',
				}]
			});

			let res = await web3.eth.getChainId();
			expect(res.toString(16)).to.eql(id.toLowerCase());
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})
