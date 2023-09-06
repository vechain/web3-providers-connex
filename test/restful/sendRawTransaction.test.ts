'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ProviderWeb3, utils } from '../../src/index';
import { urls, soloAccounts } from '../settings';
import { Web3 } from 'web3';

describe('Testing eth_sendRawTransaction', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	soloAccounts.forEach(pk => { wallet.import(pk); })

	let driver: Driver;
	let provider: ProviderWeb3;
	let web3: Web3;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			provider = new ProviderWeb3({ connex: new Framework(driver), net: net });
			web3 = new Web3(provider);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('Should get a non-empty tx receipt when querying using the returned tx hash/id', async () => {
		const raw = await utils.signTransaction({
			from: wallet.list[0].address,
			to: utils.randAddr(),
			value: '1' + '0'.repeat(18)
		}, wallet.list[0], provider)

		try {
			// web3.eth.sendSignedTransaction(raw) does not work for web3.js v4.x
			// because its code needs to unserialize the raw tx that is constructed 
			// according to the VeChain Thor protocol
			const txID = await provider.request({ method: 'eth_sendRawTransaction', params: [raw] });
			await provider.request({ method: 'evm_mine' });
			const receipt = await web3.eth.getTransactionReceipt(txID);
			expect(receipt.transactionHash).to.eql(txID);
		} catch (err: any) {
			assert.fail(`Unexpected error: ${err}`);
		}
	})
})