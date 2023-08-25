'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { Web3 } from 'web3';

import { ProviderWeb3 } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';

describe('Testing getCode', () => {
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
		const args = [100, 'test contract deploy'];

		try {
			contract = await contract.deploy({
				data: bin,
				arguments: args,
			})
				.send({
					from: wallet.list[0].address,
				})

			const n = await web3.eth.getBlockNumber();

			let code: string;
			code = await web3.eth.getCode(contract.options.address, Math.floor(n/2));
			expect(code).to.eql('0x');

			code = await web3.eth.getCode(contract.options.address, n);
			expect(code.length > 2).to.be.true;
		} catch (err: any) {
			assert.fail(err);
		}
	});
})