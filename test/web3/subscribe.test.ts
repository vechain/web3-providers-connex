'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { Web3 } from 'web3';
import { ProviderWeb3, types } from '../../src/index';
import { wait, hexToNumber } from '../../src/utils';

describe('Testing function subscribe', function () {
	before(async function () {
		const { eip1193Providers } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.solo));
	})

	it('Should return logs with the correct topic and data values', async function () {
		const { abi, bin, wallet } = this.testObject as TestObject;
		const undeployed = (new this.web3.eth.Contract(abi)).deploy({
			data: bin,
			arguments: [100, 'deploy'],
		});

		try {
			const tx = await undeployed.send({ from: wallet.list[0].address, });
			const contractAddress = tx.options.address;
			const deployed = new this.web3.eth.Contract(abi, contractAddress);
			await deployed.methods.set(200, 'set1').send({ from: wallet.list[1].address });
			await deployed.methods.set(300, 'set2').send({ from: wallet.list[2].address });
			const best = await this.web3.eth.getBlockNumber();

			const subOpts = {
				fromBlock: 0,
				toBlock: best,
				address: contractAddress,
				topics: [
					[
						this.web3.utils.sha3('Deploy(address,uint256,string)'),
						this.web3.utils.sha3('Set(address,uint256,string)')
					],
				],
			}

			const topics = [
				{
					topics: [
						this.web3.utils.sha3('Deploy(address,uint256,string)'),
						this.web3.eth.abi.encodeParameter('address', wallet.list[0].address),
					],
					data: this.web3.eth.abi.encodeParameters(['uint', 'string'], [100, 'deploy']),
				},
				{
					topics: [
						this.web3.utils.sha3('Set(address,uint256,string)'),
						this.web3.eth.abi.encodeParameter('address', wallet.list[1].address),
					],
					data: this.web3.eth.abi.encodeParameters(['uint', 'string'], [200, 'set1']),
				},
				{
					topics: [
						this.web3.utils.sha3('Set(address,uint256,string)'),
						this.web3.eth.abi.encodeParameter('address', wallet.list[2].address),
					],
					data: this.web3.eth.abi.encodeParameters(['uint', 'string'], [300, 'set2']),
				}
			]

			const sub = await this.web3.eth.subscribe('logs', subOpts);
			let count = 0;
			sub.on('data', (log: types.RetLog) => {
				let check = false;

				for (const elem of topics) {
					check = log.data === elem.data &&
						log.topics[0] === elem.topics[0] &&
						log.topics[1] === elem.topics[1];
					if (check) { break; }
				}

				expect(check).to.be.true;
				count ++;
			});

			await wait(10000);

			expect(count).to.eql(3);

			sub.unsubscribe();
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('Should return blocks with the block number incrementing by 1 each time', async function () {
		let blockNumber: number;
		try {
			const sub = await this.web3.eth.subscribe('newBlockHeaders')
			sub.on('data', (blk: types.RetBlock) => {
				if (!blockNumber) { blockNumber = hexToNumber(blk.number); }
				else {
					expect(blk.number).to.eql(blockNumber + 1);
					blockNumber++;
				}
			});
	
			await wait(50000);
	
			sub.unsubscribe();
		} catch (err: any) {
			assert.fail(err);
		}
	})
})