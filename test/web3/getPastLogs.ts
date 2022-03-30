'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';

import { ConnexProvider } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings'
const Web3 = require('web3');
import { RetLog } from '../../src/types';

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
			web3 = new Web3(new ConnexProvider(new Framework(driver)));
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
			const best = await web3.eth.getBlockNumber();

			const topic0 = web3.utils.sha3('Deploy(address,uint256,string)');
			const ret: RetLog[] = await web3.eth.getPastLogs({
				fromBlock: 'earliest',
				toBlock: best,
				address: contractAddress,
				topics: [topic0],
			});
			expect(ret[0].address).to.eql(contractAddress);
			expect(ret[0].topics[1]).to.eql(web3.eth.abi.encodeParameter('address', deployer));
			expect(ret[0].data).to.eql(web3.eth.abi.encodeParameters(['uint', 'string'], args));
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

			const best = await web3.eth.getBlockNumber();

			const ret: RetLog[] = await web3.eth.getPastLogs({
				fromBlock: 'earliest',
				toBlock: best,
				address: [contractAddress, contractAddress],
				topics: [
					[web3.utils.sha3('Deploy(address,uint256,string)')],
					[web3.utils.sha3('Set(address,uint256,string)')],
				],
			});
			
			expect(ret[0].address).to.eql(contractAddress);
			expect(ret[0].topics[1]).to.eql(web3.eth.abi.encodeParameter('address', deployer));
			expect(ret[0].data).to.eql(web3.eth.abi.encodeParameters(['uint', 'string'], args0));

			expect(ret[1].address).to.eql(contractAddress);
			expect(ret[1].topics[1]).to.eql(web3.eth.abi.encodeParameter('address', setter1));
			expect(ret[1].data).to.eql(web3.eth.abi.encodeParameters(['uint', 'string'], args1));

			expect(ret[2].address).to.eql(contractAddress);
			expect(ret[2].topics[1]).to.eql(web3.eth.abi.encodeParameter('address', setter2));
			expect(ret[2].data).to.eql(web3.eth.abi.encodeParameters(['uint', 'string'], args2));
		} catch (err: any) {
			assert.fail(err);
		}
	})
})