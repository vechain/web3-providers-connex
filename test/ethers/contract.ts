'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers } from 'ethers';
import { ConnexProvider } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';


describe('Testing contract', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => {
		wallet.import(key);
	});

	let driver: Driver;
	let provider: ethers.providers.Web3Provider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ethers.providers.Web3Provider(new ConnexProvider({connex: new Framework(driver)}));
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
		

		const factory = new ethers.ContractFactory(abi, bin);
		const args = [100, 'test contract deploy'];

		try {
			const contract = await factory.deploy(...args);

			contractAddress = contract.options.address;

			const ret: string[] = await contract.methods.get().call();
			args.forEach((val, i) => {
				expect(ret[i]).to.eql('' + val);
			})
		} catch (err: any) {
			assert.fail(err);
		}
	})

	// it('send', async () => {
	// 	const from = wallet.list[0].address;

	// 	let contract = new web3.eth.Contract(abi, contractAddress);
	// 	const args = [200, 'test contract send'];

	// 	try {
	// 		await contract.methods.set(args[0], args[1]).send({ from: from });

	// 		let ret: string[] = await contract.methods.get().call();
	// 		args.forEach((val, i) => {
	// 			expect(ret[i]).to.eql('' + val);
	// 		})
	// 	} catch (err: any) {
	// 		assert.fail(err);
	// 	}
	// })

	// it('call with error', async () => {
	// 	const contract = new web3.eth.Contract(abi, contractAddress);
	// 	contract.handleRevert = true;
	// 	const errMsg = 'Test error message in contract call';

	// 	try {
	// 		await contract.methods.set(10, 'hello').send({from: from})
	// 		await contract.methods.get().call();
	// 	} catch (err: any) {
	// 		const msg: string = err.reason;
	// 		expect(msg).to.eql(errMsg);
	// 	}
	// })
})