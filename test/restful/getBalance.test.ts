'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { Web3 } from 'web3';

import { ProviderWeb3 } from '../../src/index';
import { urls, soloAccounts } from '../settings';
import { randAddr } from '../../src/utils';

describe('Testing eth_getBalance', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(key => { wallet.import(key); })

	let driver: Driver;
	let web3: any;
	let n: bigint;
	let to: string;
	let val: string;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			web3 = new Web3(new ProviderWeb3({
				connex: new Framework(driver),
				net: net
			}));

			// Make a transfer
			to = randAddr();
			val = '1' + '0'.repeat(18);
			await web3.eth.sendTransaction({
				from: wallet.list[0].address,
				to: to,
				value: val
			})
			n = await web3.eth.getBlockNumber();

		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('Should return zero balance when querying w.r.t. a block earlier than the transfer', async () => {
		try {
			let balance: any;
			balance = await web3.eth.getBalance(to, Math.floor(Number(n) / 2));
			expect(BigInt(balance)).to.eql(0n);
		} catch (err: any) {
			assert.fail(err);
		}
	});

	it('Should return the transferred token balance when querying w.r.t. the block that includes the tx', async () => {
		try {
			let balance: any;
			balance = await web3.eth.getBalance(to, Number(n));
			expect(BigInt(balance)).to.eql(BigInt(val));
		} catch (err: any) {
			assert.fail(err);
		}
	});
})