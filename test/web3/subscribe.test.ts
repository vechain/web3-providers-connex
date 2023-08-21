'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import Web3 from 'web3';

import { ProviderWeb3, types } from '../../src/index';
import { wait, hexToNumber } from '../../src/utils';
import { urls, soloAccounts, bin, abi } from '../settings'

describe('Testing subscribe', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(pk => {
		wallet.import(pk);
	})

	let driver: Driver;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ProviderWeb3({ connex: new Framework(driver) }));
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('subscribe logs', async () => {
		let contract = new web3.eth.Contract(abi);

		try {
			contract = await contract.deploy({
				data: bin,
				arguments: [100, 'deploy'],
			})
				.send({
					from: wallet.list[0].address,
				})

			await contract.methods.set(200, 'set1').send({ from: wallet.list[1].address });
			const best = await web3.eth.getBlockNumber();

			const subOpts = {
				fromBlock: 0,
				toBlock: best,
				address: [contract.options.address, contract.options.address],
				topics: [
					[web3.utils.sha3('Deploy(address,uint256,string)')],
					[web3.utils.sha3('Set(address,uint256,string)')],
				],
			}

			const topics = [
				{
					topics: [
						web3.utils.sha3('Deploy(address,uint256,string)'),
						web3.eth.abi.encodeParameter('address', wallet.list[0].address),
					],
					data: web3.eth.abi.encodeParameters(['uint', 'string'], [100, 'deploy']),
				},
				{
					topics: [
						web3.utils.sha3('Set(address,uint256,string)'),
						web3.eth.abi.encodeParameter('address', wallet.list[1].address),
					],
					data: web3.eth.abi.encodeParameters(['uint', 'string'], [200, 'set1']),
				},
				{
					topics: [
						web3.utils.sha3('Set(address,uint256,string)'),
						web3.eth.abi.encodeParameter('address', wallet.list[2].address),
					],
					data: web3.eth.abi.encodeParameters(['uint', 'string'], [300, 'set2']),
				}
			]

			const sub = web3.eth.subscribe('logs', subOpts, (err: any, result: types.RetLog) => {
				if (err) { assert.fail(err); }

				let check = false;

				for (const elem of topics) {
					check = result.data === elem.data &&
						result.topics[0] === elem.topics[0] &&
						result.topics[1] === elem.topics[1];
					if (check) { break; }
				}

				expect(check).to.be.true;
			})
				.on('data', (log: Object) => {
					console.log(`On data: ${JSON.stringify(log)}`);
				})

			await wait(1000);

			await contract.methods.set(300, 'set2').send({ from: wallet.list[2].address });

			await wait(10000);

			sub.unsubscribe((err: any, success: boolean) => {
				if (err) { assert.fail(err); }
			});
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('subscribe newBlockHeaders', async () => {
		let blockNumber: number;
		const sub = web3.eth.subscribe('newBlockHeaders', (err: any, result: types.RetBlock) => {
			if (err) { assert.fail(err); }
			if (!blockNumber) { blockNumber = hexToNumber(result.number); }
			else {
				expect(result.number).to.eql(blockNumber + 1);
				blockNumber++;
			}
		})
			.on('data', (header: object) => {
				console.log(`On data: ${JSON.stringify(header)}`);
			});

		await wait(50000);

		sub.unsubscribe((err: any, success: boolean) => {
			if (err) { assert.fail(err); }
		});
	})
})