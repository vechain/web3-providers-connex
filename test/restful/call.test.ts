'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { randomBytes } from 'crypto';
import { energyAddr, energyABI } from 'thor-builtin';

import { Provider } from '../../src/index';
import { urls, soloAccounts } from '../settings';
import { randAddr } from '../../src/utils';
import { ProviderRpcError } from '../../src/eip1193';

describe('Testing call', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();
	wallet.import(soloAccounts[0])
	const randPk = '0x' + randomBytes(32).toString('hex');
	wallet.import(randPk);

	let driver: Driver;
	let provider: Provider;
	let connex: Connex;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
			connex = new Framework(driver)
			provider = new Provider({
				connex: connex,
				net: net
			});
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(() => {
		driver?.close();
	})

	it('call with revision', async () => {
		// Get the block when wallet[1] has zero balance
		const n = parseInt(await provider.request({ method: 'eth_blockNumber' }), 16);

		// Transfer vet & vethor from wallet[0] to wallet[1]
		const transferABI = (energyABI as any[]).find(abi => abi.name === "transfer" && abi.type === "function")
		const clause = connex.thor.account(energyAddr).method(transferABI)
			.asClause(wallet.list[1].address, '1000000000000000000000');
		await connex.vendor.sign('tx', [
			{ to: wallet.list[1].address, value: '1000000000000000000', data: '0x' },
			{ ...clause }
		]).signer(wallet.list[0].address).request()

		await provider.request({method: "evm_mine"})
		const callObj = {
			from: wallet.list[1].address,
			to: randAddr(),
			value: '1000000000000000000'
		}

		let ret: string;
		try {
			ret = await provider.request({
				method: 'eth_call',
				params: [callObj, n]
			});
			assert.fail('Test failed')
		} catch (err: any) {
			expect((err as ProviderRpcError).message).to.eql('insufficient balance for transfer');
		}

		try {
			ret = await provider.request({
				method: 'eth_call',
				params: [callObj]
			});
			expect(ret).to.eql('0x');
		} catch (err: any) {
			assert.fail(err);
		}
	});
})