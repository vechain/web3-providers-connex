'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { randomBytes } from 'crypto';
import { energyAddr, energyABI } from 'thor-builtin';
import Web3 from 'web3';

import { ConnexProvider } from '../../src/index';
import { urls, soloAccounts } from '../settings';
import { randAddr, toBytes32 } from '../../src/utils';

describe('Testing call', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	wallet.import(soloAccounts[0])
	const randPk = '0x' + randomBytes(32).toString('hex');
	wallet.import(randPk);

	let driver: Driver;
	let provider: ConnexProvider;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ConnexProvider({
				connex: new Framework(driver),
				net: net
			});
			web3 = new Web3(provider);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('call without revision', async () => {
		const callObj = {
			from: wallet.list[0].address,
			to: randAddr(),
			value: '1' + '0'.repeat(18)
		}
		try {
			await provider.request({
				method: 'eth_call',
				params: [callObj]
			})

			await provider.request({
				method: 'eth_call',
				params: [callObj, 'latest']
			})
		} catch (err: any) {
			assert.fail(err.message || err)
		}
	})

	it('call with revision', async () => {
		// Transfer vethor to wallet[1] to make it have sufficient energy balance
		const energy = new web3.eth.Contract(energyABI, energyAddr);
		await energy.methods.transfer(wallet.list[1].address, '100' + '0'.repeat(18))
			.send({ from: wallet.list[0].address });
		await web3.eth.sendTransaction({
			from: wallet.list[0].address,
			to: wallet.list[1].address,
			value: '1' + '0'.repeat(18)
		});

		// record the block number when wallet[1] has sufficient energy balance
		const n = await web3.eth.getBlockNumber();

		const callObj = {
			from: wallet.list[1].address,
			to: randAddr(),
			value: '1' + '0'.repeat(18)
		}

		let ret: string;
		try {
			ret = await provider.request({
				method: 'eth_call',
				params: [callObj, Math.floor(n / 2)]
			});
			assert.fail('Unexpected error');
		} catch (err: any) {
			expect(<string>(err.message).toLowerCase()).to.eql('insufficient balance for transfer');
		}

		// call at the previous block when wallet[1] doesn't have sufficient energy balance
		try {
			ret = await web3.eth.call(callObj, n);
			expect(ret).to.eql('0x');
		} catch (err: any) {
			assert.fail(err);
		}
	});
})