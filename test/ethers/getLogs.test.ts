'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ethers } from 'ethers';
import { Log, Filter } from '@ethersproject/abstract-provider';
import { abi as ABI, keccak256 } from 'thor-devkit';
import * as thor from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';

describe('Testing getLogs', () => {
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
					new thor.ProviderEthers({ connex: new Framework(driver) })
				)
			);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	const deployer = wallet.list[0].address;
	const setter1 = wallet.list[0].address;
	const setter2 = wallet.list[0].address;
	let contractAddress: string;
	let fromBlock: number;
	let contract: ethers.Contract;

	const test = (ret: Log, addr: string, args: any[]) => {
		expect(ret.address).to.eql(contractAddress);
		expect(ret.topics[1]).to.eql(ABI.encodeParameter('address', addr));
		expect(ret.data).to.eql(ABI.encodeParameters(
			[{ name: 'a', type: 'uint' }, { name: 'b', type: 'string' }],
			args,
		));
	}

	const tests = (ret: Log[], accs: string[], args: any[][]) => {
		ret.forEach(ret => {
			for(let i = 0; i < accs.length; i++) {

			}
		})
	}

	it('single query', async () => {
		fromBlock = await provider.getBlockNumber();

		const factory = thor.ethers.modifyFactory(
			new ethers.ContractFactory(abi, bin, provider.getSigner(deployer))
		);
		const args = [100, 'test contract deploy'];

		try {
			contract = await factory.deploy(...args);

			contractAddress = contract.address;

			const topic0 = ethers.utils.keccak256(Buffer.from('Deploy(address,uint256,string)'));
			let ret: Log[];

			// With address & topics
			ret = await provider.getLogs({
				fromBlock: fromBlock,
				address: contractAddress,
				topics: [topic0],
			});
			test(ret[0], deployer, args);

			// with only address
			ret = await provider.getLogs({
				fromBlock: fromBlock,
				address: contractAddress,
			});
			// skip event $Master(address) emitted when creating the contract
			test(ret[1], deployer, args);

			// with only topics
			ret = await provider.getLogs({
				fromBlock: fromBlock,
				topics: [topic0],
			});
			test(ret[0], deployer, args);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('multiple queries', async () => {
		const args0 = [100, 'test contract deploy'];
		const args1 = [200, 'set1'];
		const args2 = [300, 'set2'];
		const topics = [
			[ethers.utils.keccak256(Buffer.from('Deploy(address,uint256,string)'))],
			[ethers.utils.keccak256(Buffer.from('Set(address,uint256,string)'))],
		];

		try {
			contract = new ethers.Contract(contractAddress, abi, provider.getSigner(setter1));
			await contract.set(args1[0], args1[1]);
			contract = new ethers.Contract(contractAddress, abi, provider.getSigner(setter2));
			await contract.set(args2[0], args2[1]);

			let ret: Log[];
			ret = await provider.getLogs({
				fromBlock: fromBlock,
				address: contractAddress,
				topics: topics,
			});
			tests(ret, [deployer, setter1, setter2], [args0, args1, args2]);

			// with only topics
			ret = await provider.getLogs({
				fromBlock: fromBlock,
				topics: topics,
			});
			tests(ret, [deployer, setter1, setter2], [args0, args1, args2]);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})