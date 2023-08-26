'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { Web3 } from 'web3';

import { ProviderWeb3 } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';

describe('Testing eth_getCode', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => { wallet.import(key); })

	let driver: Driver;
	let web3: any;
	let contractAddress: string;
	let n: bigint;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ProviderWeb3({
				connex: new Framework(driver),
				net: net
			}));

			// Deploy a contract
			let contract = new web3.eth.Contract(abi);
			const args = [100, 'test contract deploy'];
			contract = await contract.deploy({
				data: bin,
				arguments: args,
			})
				.send({
					from: wallet.list[0].address,
				})
			n = await web3.eth.getBlockNumber();
			contractAddress = contract.options.address;
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('Should get no code when querying w.r.t. a block before the contract deployment', async () => {
		try {
			const code = await web3.eth.getCode(contractAddress, Math.floor(Number(n) / 2));
			expect(code).to.eql('0x');
		} catch (err: any) {
			assert.fail(err);
		}
	});

	it('Should return the contract code when querying w.r.t. a block that includes the contract deployment tx', async () => {
		try {
			const code = await web3.eth.getCode(contractAddress, Number(n));
			expect(code.length > 2).to.be.true;
		} catch (err: any) {
			assert.fail(err);
		}
	});	
})