'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';

import { ConnexProvider, types } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';
const Web3 = require('web3');

describe('Testing getPastLogs', () => {
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
			web3 = new Web3(new ConnexProvider({ connex: new Framework(driver) }));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver.close();
	})

	let contractAddress: string;
	const deployer = wallet.list[0].address;
	const setter1 = wallet.list[0].address;
	const setter2 = wallet.list[0].address;

	const test = (ret: types.RetLog, addr: string, args: any[]) => {
		expect(ret.address).to.eql(contractAddress);
		expect(ret.topics[1]).to.eql(web3.eth.abi.encodeParameter('address', addr));
		expect(ret.data).to.eql(web3.eth.abi.encodeParameters(['uint', 'string'], args));
	}

	const tests = (ret: types.RetLog[], accs: string[], args: any[][]) => {
		ret.forEach((ret, i) => {
			test(ret, accs[i], args[i]);
		})
	}

	it('single query', async () => {
		let contract = new web3.eth.Contract(abi);
		const args = [100, 'test contract deploy'];

		try {
			const c = await contract.deploy({
				data: bin,
				arguments: args,
			})
				.send({
					from: deployer,
				})

			contractAddress = c.options.address;
			
			const topic0 = web3.utils.sha3('Deploy(address,uint256,string)');
			let ret: types.RetLog[];

			// With address & topics
			ret = await web3.eth.getPastLogs({
				address: contractAddress,
				topics: [topic0],
			});
			test(ret[0], deployer, args);

			// with only address
			ret = await web3.eth.getPastLogs({
				address: contractAddress,
			});
			// skip event $Master(address) emitted when creating the contract
			test(ret[1], deployer, args);

			// with only topics
			ret = await web3.eth.getPastLogs({
				topics: [topic0],
			});
			test(ret[0], deployer, args);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('multiple queries', async () => {
		let contract = new web3.eth.Contract(abi, contractAddress);
		const args0 = [100, 'test contract deploy'];
		const args1 = [200, 'set1'];
		const args2 = [300, 'set2'];

		try {
			await contract.methods.set(args1[0], args1[1]).send({ from: setter1 });
			await contract.methods.set(args2[0], args2[1]).send({ from: setter2 });

			let ret: types.RetLog[];
			ret = await web3.eth.getPastLogs({
				fromBlock: 'earliest',
				address: [contractAddress, contractAddress],
				topics: [
					[web3.utils.sha3('Deploy(address,uint256,string)')],
					[web3.utils.sha3('Set(address,uint256,string)')],
				],
			});
			tests(ret, [deployer, setter1, setter2], [args0, args1, args2]);

			// with only topics
			ret = await web3.eth.getPastLogs({
				fromBlock: 'earliest',
				topics: [
					[web3.utils.sha3('Deploy(address,uint256,string)')],
					[web3.utils.sha3('Set(address,uint256,string)')],
				],
			});
			// extract the latest three logs emitted when creating the contract
			const last = ret.length - 1;
			tests(
				[ret[last - 2], ret[last - 1], ret[last]],
				[deployer, setter1, setter2],
				[args0, args1, args2]
			);
		} catch (err: any) {
			assert.fail(err);
		}
	})
})