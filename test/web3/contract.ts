'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';

import { ConnexProvider } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';
const Web3 = require('web3');

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

	let contractAddress: string;
	const from = wallet.list[0].address;

	it('deploy', async () => {
		let contract = new web3.eth.Contract(abi);
		const args = [100, 'test contract deploy'];

		try {
			contract = await contract.deploy({
				data: bin,
				arguments: args,
			})
				.send({
					from: from,
				})

			contractAddress = contract.options.address;

			const ret: string[] = await contract.methods.get().call();
			args.forEach((val, i) => {
				expect(ret[i]).to.eql('' + val);
			})
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('send', async () => {
		const from = wallet.list[0].address;

		let contract = new web3.eth.Contract(abi, contractAddress);
		const args = [200, 'test contract send'];

		try {
			await contract.methods.set(args[0], args[1]).send({ from: from });

			let ret: string[] = await contract.methods.get().call();
			args.forEach((val, i) => {
				expect(ret[i]).to.eql('' + val);
			})
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('call with error', async () => {
		const contract = new web3.eth.Contract(abi, contractAddress);
		contract.handleRevert = true;
		const errMsg = 'Test error message in contract call';

		try {
			await contract.methods.set(10, 'hello').send({from: from})
			await contract.methods.get().call();
		} catch (err: any) {
			const msg: string = err.reason;
			expect(msg).to.eql(errMsg);
		}
	})
})