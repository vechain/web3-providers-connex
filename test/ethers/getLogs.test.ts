'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { abi as ABI } from 'thor-devkit';

import { TestObject } from '../testSetup';
import { BrowserProvider, Log, keccak256, Contract, ContractFactory } from 'ethers';
import { modifyProvider, modifyFactory } from '../../src/ethers';

describe('Testing function getLogs', function () {
	let deployer: string;
	let setter1: string;
	let setter2: string;
	let contractAddress: string;

	before(function () {
		const { eip1193Providers, wallet } = this.testObject as TestObject;
		this.provider = modifyProvider(new BrowserProvider(eip1193Providers.solo));

		deployer = wallet.list[0].address;
		setter1 = wallet.list[0].address;
		setter2 = wallet.list[0].address;
	});

	const test = function (ret: Log, addr: string, args: any[]) {
		expect(ret.address).to.eql(contractAddress);
		expect(ret.topics[1]).to.eql(ABI.encodeParameter('address', addr));
		expect(ret.data).to.eql(ABI.encodeParameters(
			[{ name: 'a', type: 'uint' }, { name: 'b', type: 'string' }],
			args,
		));
	}

	const tests = (ret: Log[], accs: string[], args: any[][]) => {
		for(let i = 0; i < ret.length; i++) {
			test(ret[i], accs[i], args[i]);
		}
	}

	it('single query', async function () {
		const { abi, bin } = this.testObject as TestObject;

		this.fromBlock = await this.provider.getBlockNumber();

		const signer = await this.provider.getSigner(deployer);
		const factory = modifyFactory(new ContractFactory(abi, bin, signer));

		const args = [100, 'test contract deploy'];

		try {
			const base = await factory.deploy(...args);
			await base.waitForDeployment();

			contractAddress = await base.getAddress();

			const topic0 = keccak256(Buffer.from('Deploy(address,uint256,string)'));
			let ret: Log[];

			// With address & topics
			ret = await this.provider.getLogs({
				fromBlock: this.fromBlock,
				address: contractAddress,
				topics: [topic0],
			});
			test(ret[0], deployer, args);

			// with only address
			ret = await this.provider.getLogs({
				fromBlock: this.fromBlock,
				address: contractAddress,
			});
			// skip event $Master(address) emitted when creating the contract
			test(ret[1], deployer, args);

			// with only topics
			ret = await this.provider.getLogs({
				fromBlock: this.fromBlock,
				topics: [topic0],
			});
			test(ret[0], deployer, args);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('multiple queries', async function () {
		const { abi } = this.testObject as TestObject;

		const args0 = [100, 'test contract deploy'];
		const args1 = [200, 'set1'];
		const args2 = [300, 'set2'];
		const topics = [
			[keccak256(Buffer.from('Deploy(address,uint256,string)'))],
			[keccak256(Buffer.from('Set(address,uint256,string)'))],
		];

		try {
			const signer1 = await this.provider.getSigner(setter1);
			const contract1 = new Contract(contractAddress, abi, signer1);
			await contract1.set(args1[0], args1[1]);

			const signer2 = await this.provider.getSigner(setter2);
			const contract2 = new Contract(contractAddress, abi, signer2);
			await contract2.set(args2[0], args2[1]);

			let ret: Log[];
			ret = await this.provider.getLogs({
				fromBlock: this.fromBlock,
				address: contractAddress,
				topics: topics,
			});
			tests(ret, [deployer, setter1, setter2], [args0, args1, args2]);

			// with only topics
			ret = await this.provider.getLogs({
				fromBlock: this.fromBlock,
				topics: topics,
			});
			tests(ret, [deployer, setter1, setter2], [args0, args1, args2]);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})