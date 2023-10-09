'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { ProviderWeb3, types } from '../../src/index';
import { Web3 } from 'web3';

describe('Testing function getPastLogs', function () {
	before(async function () {
		const { eip1193Providers } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.solo));
	})

	let contractAddress: string;
	let fromBlock: number;

	const test = function (ret: types.RetLog, addr: string, args: any[], web3: any) {
		expect(ret.address.toLowerCase()).to.eql(contractAddress.toLowerCase());
		expect(ret.topics[1]).to.eql(web3.eth.abi.encodeParameter('address', addr));
		expect(ret.data).to.eql(web3.eth.abi.encodeParameters(['uint', 'string'], args));
	}

	const tests = (ret: types.RetLog[], accs: string[], args: any[][], web3: any) => {
		ret.forEach((ret, i) => {
			test(ret, accs[i], args[i], web3);
		})
	}

	it('single query', async function () {
		const { abi, bin, wallet } = this.testObject as TestObject;
		const deployer = wallet.list[0].address;
		const args = [100, 'test contract deploy'];
		const undeployed = (new this.web3.eth.Contract(abi)).deploy({
			data: bin,
			arguments: args,
		});

		try {
			fromBlock = await this.web3.eth.getBlockNumber();

			const tx = await undeployed.send({ from: deployer });
			contractAddress = tx.options.address;

			const topic0 = this.web3.utils.sha3('Deploy(address,uint256,string)');
			let ret: types.RetLog[];

			// With address & topics
			ret = await this.web3.eth.getPastLogs({
				fromBlock: fromBlock,
				address: contractAddress,
				topics: [topic0],
			});
			test(ret[0], deployer, args, this.web3);

			// with only address
			ret = await this.web3.eth.getPastLogs({
				fromBlock: fromBlock,
				address: contractAddress,
			});
			// skip event $Master(address) emitted when creating the contract
			const topic = this.web3.eth.abi.encodeParameter('address', deployer);
			if (ret[0].topics[1] === topic) {
				test(ret[0], deployer, args, this.web3);
			} else if (ret[1].topics[1] === topic) {
				test(ret[1], deployer, args, this.web3);
			} else {
				assert.fail('Log not found');
			}

			// with only topics
			ret = await this.web3.eth.getPastLogs({
				fromBlock: fromBlock,
				topics: [topic0],
			});
			test(ret[0], deployer, args, this.web3);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('multiple queries', async function () {
		const { abi, wallet } = this.testObject as TestObject;
		const deployer = wallet.list[0].address;
		const setter1 = wallet.list[0].address;
		const setter2 = wallet.list[0].address;

		let contract = new this.web3.eth.Contract(abi, contractAddress);
		const args0 = [100, 'test contract deploy'];
		const args1 = [200, 'set1'];
		const args2 = [300, 'set2'];

		try {
			await contract.methods.set(args1[0], args1[1]).send({ from: setter1 });
			await contract.methods.set(args2[0], args2[1]).send({ from: setter2 });

			let ret: types.RetLog[];
			ret = await this.web3.eth.getPastLogs({
				fromBlock: fromBlock,
				address: [contractAddress, contractAddress],
				topics: [
					[this.web3.utils.sha3('Deploy(address,uint256,string)')],
					[this.web3.utils.sha3('Set(address,uint256,string)')],
				],
			});
			tests(ret, [deployer, setter1, setter2], [args0, args1, args2], this.web3);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})