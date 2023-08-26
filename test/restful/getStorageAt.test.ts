'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { Web3 } from 'web3';

import { ProviderWeb3 } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';
import { toBytes32 } from '../../src/utils';

describe('Testing eth_getStorageAt', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => { wallet.import(key); })

	let driver: Driver;
	let web3: any;
	let n: bigint;
	let contractAddress: string;
	const actual = 100;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ProviderWeb3({
				connex: new Framework(driver),
				net: net
			}));

			// Deploy a contract
			let contract = new web3.eth.Contract(abi);
			contract = await contract.deploy({
				data: bin,
				arguments: [actual, 'msg: deploy'],
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

	it('Should return zero value when querying w.r.t. a block before the contract deployment', async () => {
		try {
			const value = await web3.eth.getStorageAt(contractAddress, 0, Math.floor(Number(n) / 2));
			expect(value).to.eql('0x' + '0'.repeat(64));
		} catch (err: any) {
			assert.fail(err);
		}
	});

	it('Should return a value equal to 100 when querying w.r.t. a block that includes the contract deployment tx', async () => {
		try {
			const value = await web3.eth.getStorageAt(contractAddress, 0, Number(n));
			expect(value).to.eql(toBytes32('0x' + BigInt(actual).toString(16)));
		} catch (err: any) {
			assert.fail(err);
		}
	});
})