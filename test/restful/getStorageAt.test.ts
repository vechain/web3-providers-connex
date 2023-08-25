'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { Web3 } from 'web3';

import { ProviderWeb3 } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';
import { toBytes32 } from '../../src/utils';

describe('Testing getStorageAt', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => { wallet.import(key); })

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ProviderWeb3({
				connex: new Framework(driver),
				net: net
			}));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('test revision', async () => {
		let contract = new web3.eth.Contract(abi);
		const args = [100, 'msg: deploy'];

		try {
			contract = await contract.deploy({
				data: bin,
				arguments: args,
			})
				.send({
					from: wallet.list[0].address,
				})

			const n = await web3.eth.getBlockNumber();

			let value: string;
			value = await web3.eth.getStorageAt(contract.options.address, 0, Math.floor(n / 2));
			expect(value).to.eql('0x' + '0'.repeat(64));

			value = await web3.eth.getStorageAt(contract.options.address, 0, n);
			expect(value).to.eql(toBytes32('0x64'));
		} catch (err: any) {
			assert.fail(err);
		}
	});
})