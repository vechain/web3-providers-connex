'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { BigNumber, ethers } from 'ethers';
import { abi as ABI } from 'thor-devkit';
import * as thor from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';

describe('Testing contract', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => {
		wallet.import(key);
	});

	let driver: Driver;
	let provider: ethers.providers.JsonRpcProvider;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = thor.ethers.modifyProvider(
				new ethers.providers.Web3Provider(
					new thor.ConnexProvider({ connex: new Framework(driver) })
				)
			);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	const from = wallet.list[0].address;
	let contractAddress: string;

	it('deploy', async () => {
		const factory = thor.ethers.modifyFactory(
			new ethers.ContractFactory(abi, bin, provider.getSigner(from))
		);
		const args = [100, 'test contract deploy'];

		try {
			const contract = await factory.deploy(...args);
			await contract.deployTransaction.wait();

			contractAddress = contract.address;

			const filter = contract.filters.Deploy();
			const logs = await contract.queryFilter(filter);

			const topic0 = ethers.utils.keccak256(Buffer.from('Deploy(address,uint256,string)'));
			expect(logs.length).to.eql(1);

			const log = logs[0];
			if (!!log.address) {
				expect(log.address.toLowerCase()).to.eql(contractAddress.toLowerCase());
			}
			if (!!log.topics) {
				expect(log.topics[0]).to.eql(topic0);
				expect(log.topics[1]).to.eql(ABI.encodeParameter('address', from));
			}

			const ret = await contract.get();
			expect(<BigNumber>ret[0].toNumber()).to.eql(args[0]);
			expect(<string>ret[1]).to.eql(args[1]);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('send', async () => {
		let contract = new ethers.Contract(contractAddress, abi, provider.getSigner(from));
		const args = [200, 'test contract send'];

		try {
			await contract.set(args[0], args[1]);

			let ret = await contract.get();
			expect(<BigNumber>ret[0].toNumber()).to.eql(args[0]);
			expect(<string>ret[1]).to.eql(args[1]);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('call with error', async () => {
		const contract = new ethers.Contract(contractAddress, abi, provider.getSigner(from));
		const errMsg = 'Test error message in contract call';

		try {
			const ret = await contract.set(10, 'hello');
			await contract.get();
		} catch (err: any) {
			const msg: string = thor.utils.decodeRevertReason(err.error.data);
			expect(msg).to.eql(errMsg);
		}
	})
})