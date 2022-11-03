'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';

import { ConnexProvider } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';
import Web3 from 'web3';

describe('Testing fee delegate', () => {
	const net = new SimpleNet("https://sync-mainnet.veblocks.net");
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => {
		wallet.import(key);
	});

	let driver: Driver;
	let provider: ConnexProvider;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ConnexProvider({ connex: new Framework(driver) });
			web3 = new Web3(provider);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	let contractAddress: string;
	const from = wallet.list[0].address;

	it('deploy contract', async () => {
		const opt = {
			url: 'https://sponsor.vechain.energy/by/16',
			payer: '0x66cbb32b38e61b8f4df9b61d9244fb19805dd7ee'
		}
		provider.enableDelegate(opt);

		let contract = new web3.eth.Contract(abi);
		const args = [100, 'test contract deploy'];

		try {
			contract = await contract.deploy({
				data: bin,
				arguments: args,
			})
				.send({
					from: from,
				})

			contractAddress = contract.options.address;

			const ret: string[] = await contract.methods.get().call();
			args.forEach((val, i) => {
				expect(ret[i]).to.eql('' + val);
			})
		} catch (err: any) {
			assert.fail(err);
		}

		provider.disableDelegate();
		try {
			await contract.methods.set(200, 'disable delegate').send({ from: from });
			assert.fail('Failed to disable delegate')
		} catch (err: any) {
			expect(err.message).to.eql('403 post transactions: tx rejected: insufficient energy');
		}
	});
})