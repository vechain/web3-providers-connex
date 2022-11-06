'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';

import { ProviderWeb3 } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';
import Web3 from 'web3';
import { DelegateOpt } from '../../src/types';

describe('Testing fee delegate', () => {
	const net = new SimpleNet(urls.mainnet);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => {
		wallet.import(key);
	});

	let driver: Driver;
	let provider: ProviderWeb3;
	let web3: any;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ProviderWeb3({ connex: new Framework(driver) });
			web3 = new Web3(provider);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	const from = wallet.list[0].address;

	it('deploy contract', async () => {
		const opt: DelegateOpt = {
			url: 'https://sponsor.vechain.energy/by/16'
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
				});

			const ret: string[] = await contract.methods.get().call();
			args.forEach((val, i) => {
				expect(ret[i]).to.eql('' + val);
			})
		} catch (err: any) {
			assert.fail(err.message);
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