'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';

import { ConnexProvider } from '../src/index';
import { urls, soloAccounts, abi, bin, binRuntime } from './settings'
import Web3 from 'web3';

describe('Testing contract', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => {
		wallet.import(key);
	});

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ConnexProvider(new Framework(driver)));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	it('deploy', async () => {
		let contract = new web3.eth.Contract(abi);

		try {
			const deployed = await contract.deploy({
				data: bin,
				arguments: [100, 'test contract deploy'],
			})
				.send({
					from: wallet.list[0].address,
				})

			console.log(deployed);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})