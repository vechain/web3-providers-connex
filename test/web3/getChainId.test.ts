'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ProviderWeb3 } from '../../src/index';
import { urls } from '../settings';

describe('Testing getChainId', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ProviderWeb3({ connex: new Framework(driver) }));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})
	
	it('get mainnet genesis Id', async () => {
		const tag: string = "0x851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a";

		try {
			web3.extend({
				property: 'eth',
				methods: [{
					name: 'getChainId',
					call: 'eth_chainId',
					params: 0,
				}]
			});

			let res = await web3.eth.getChainId();
			
			expect("0x" + res.toString(16)).to.eql(tag);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})