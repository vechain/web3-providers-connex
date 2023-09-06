'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { TestObject } from '../testSetup';
import { ProviderWeb3 } from '../../src/index';
import { Web3 } from 'web3';

describe('Testing operations on contract', () => {
	before(function () {
		const { eip1193Providers } = this.testObject as TestObject;
		this.web3 = new Web3(new ProviderWeb3(eip1193Providers.solo));
	})

	let contractAddress: string;
	let from: string;

	it('Should deploy the contract and return the correct initial values', async function () {
		const { abi, bin, wallet } = this.testObject as TestObject;
		from = wallet.list[0].address;
		const args = [100, 'test contract deploy'];
		const undeployed = (new this.web3.eth.Contract(abi)).deploy({
			data: bin,
			arguments: args,
		});

		try {
			const tx = await undeployed.send({ from: from });

			if (!tx.options.address) {
				assert.fail('Contract address is undefined');
			}
			contractAddress = tx.options.address;
			
			const deployed = new this.web3.eth.Contract(abi, contractAddress);
			const ret = await deployed.methods.get().call();
			expect(ret[0].toString()).to.eql('' + args[0]);
			expect(ret[1]).to.eql(args[1]);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('Should return the correct set values after calling fn set', async function () {
		const { abi, wallet } = this.testObject as TestObject;
		const from = wallet.list[0].address;

		let contract = new this.web3.eth.Contract(abi, contractAddress);
		const args = [200, 'test contract send'];

		try {
			await contract.methods.set(args[0], args[1]).send({ from: from });

			let ret = await contract.methods.get().call();
			expect(ret[0].toString()).to.eql('' + args[0]);
			expect(ret[1]).to.eql(args[1]);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('Should return the correct error message', async function () {
		const { abi } = this.testObject as TestObject;
		const contract = new this.web3.eth.Contract(abi, contractAddress);
		contract.handleRevert = true;
		const errMsg = 'Test error message in contract call';

		try {
			await contract.methods.set(10, 'hello').send({ from: from })
			await contract.methods.get().call();
			assert.fail('Unexpected error');
		} catch (err: any) {
			const msg: string = err.innerError.message;
			assert.ok(msg.includes(errMsg));
		}
	})
})