'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { abi as ABI } from 'thor-devkit';
import { decodeRevertReason } from '../../src/utils';
import { TestObject } from './testSetup';
import {
	BrowserProvider,
	ContractFactory,
	Contract,
	keccak256
} from "ethers";
import { modifyProvider, modifyFactory } from '../../src/ethers';

describe('Testing operating contracts', function () {
	before(function () {
		const { eip1193Providers, wallet } = this.testObject as TestObject;
		this.provider = modifyProvider(modifyProvider(new BrowserProvider(eip1193Providers.solo)));
		this.from = wallet.list[0].address;
	})

	it('should have the correct log outputs and initial variable values after deploying contract Test', async function () {
		const { abi, bin } = this.testObject as TestObject;

		const signer = await this.provider.getSigner(this.from);
		const factory = modifyFactory(new ContractFactory(abi, bin, signer));
		const args = [100, 'test contract deploy'];

		try {
			const base = await factory.deploy(...args);
			await base.waitForDeployment();

			this.contractAddress = await base.getAddress();
			const contract = new Contract(this.contractAddress, abi, signer);

			const filter = contract.filters.Deploy();
			const logs = await contract.queryFilter(filter);

			const topic0 = keccak256(Buffer.from('Deploy(address,uint256,string)'));
			expect(logs.length).to.eql(1);

			const log = logs[0];
			expect(log.address.toLowerCase()).to.eql(this.contractAddress.toLowerCase());
			expect(log.topics[0]).to.eql(topic0);
			expect(log.topics[1]).to.eql(ABI.encodeParameter('address', this.from));

			const ret = await contract.get();
			expect(<BigInt>ret[0].toString()).to.eql('' + args[0]);
			expect(<string>ret[1]).to.eql(args[1]);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('should have the correct variable value after calling fn set of the deployed contract', async function () {
		const { abi } = this.testObject as TestObject;

		const signer = await this.provider.getSigner(this.from);
		const contract = new Contract(this.contractAddress, abi, signer);
		const args = [200, 'test contract send'];

		try {
			await contract.set(args[0], args[1]);

			let ret = await contract.get();
			expect(<BigInt>ret[0].toString()).to.eql('' + args[0]);
			expect(<string>ret[1]).to.eql(args[1]);
		} catch (err: any) {
			assert.fail(err);
		}
	})

	it('should include the correct error message after calling fn set of the deployed contract reverted', async function () {
		const { abi } = this.testObject as TestObject;

		const signer = await this.provider.getSigner(this.from);
		const contract = new Contract(this.contractAddress, abi, signer);
		const errMsg = 'Test error message in contract call';

		try {
			await contract.set(10, 'hello');
			await contract.get();
		} catch (err: any) {
			const msg = decodeRevertReason(err.data);
			expect(msg).to.eql(errMsg);
		}
	})
})