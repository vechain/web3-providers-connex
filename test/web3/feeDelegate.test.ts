'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { soloAccounts, urls, abi, bin } from '../settings';
import { SimpleWallet, Driver, SimpleNet } from '@vechain/connex-driver';
import { Framework } from '@vechain/connex-framework';
import { ProviderWeb3 } from '../../src/index';
import { Web3 } from 'web3';
import { DelegateOpt } from '../../src/types';
import http from 'http';
import { Transaction } from 'thor-devkit';

describe('Testing fee delegate', function () {
	const wallet = new SimpleWallet();
	let srv: http.Server;
	let driver: Driver;
	let web3: any;
	let provider: ProviderWeb3;
	let contractAddress: string;

	before(async function () {
		try {
			const net = new SimpleNet(urls.solo);
			const driver = await Driver.connect(net, wallet);
			provider = new ProviderWeb3({ connex: new Framework(driver) });
			web3 = new Web3(provider);

			const acc = web3.eth.accounts.create();
			wallet.import(acc.privateKey);
			wallet.import(soloAccounts[0]);

			srv = http.createServer(async (req: http.IncomingMessage, resp: http.ServerResponse) => {
				const buffers: any[] = [];
				for await (const chunk of req) {
					buffers.push(chunk);
				}
				const body = JSON.parse(Buffer.concat(buffers).toString());
				const tx = Transaction.decode(Buffer.from(body.raw.slice(2), 'hex'), true);
				const sigBuf = await wallet.list[1].sign(tx.signingHash(body.origin));
				const ret = {
					signature: '0x' + sigBuf.toString('hex')
				};

				const responseStr = JSON.stringify(ret);
				resp.setHeader('Content-Type', 'application/json');
				resp.setHeader('Content-Length', Buffer.byteLength(responseStr));
				resp.write(responseStr);
				resp.end();
			}).listen(8000);
		} catch (err: any) {
			assert.fail('Initialization failed: ' + err);
		}
	})

	after(function () {
		if (srv) {
			srv.close();
		}

		if (driver) {
			driver.close();
		}
	})

	it('Should deploy the contract using an account with zero balance when fee delegation is on', async function () {
		const opt: DelegateOpt = {
			url: 'http://localhost:8000'
		}
		provider.enableDelegate(opt);

		
		const args = [100, 'test contract deploy'];
		const from = wallet.list[0].address;
		const undeployed = (new web3.eth.Contract(abi)).deploy({
			data: bin,
			arguments: args,
		})

		try {
			const tx = await undeployed.send({
				from: from,
			});

			if (!tx.options.address) {
				assert.fail('Contract address is undefined');
			}
			contractAddress = tx.options.address;
			
			const deployed = new web3.eth.Contract(abi, contractAddress);
			const ret = await deployed.methods.get().call();
			expect(ret[0]).to.eql(BigInt(args[0]));
			expect(ret[1]).to.eql(args[1]);
		} catch (err: any) {
			assert.fail(err.message);
		}
	})

	it('Should return error caused by using an account with zero balance to send a transaction when fee delegation is off', async function () {
		provider.disableDelegate();
		try {
			const deployed = new web3.eth.Contract(abi, contractAddress);
			await deployed.methods.set(200, 'disable delegate').send({ from: wallet.list[0].address });
			assert.fail('Failed to disable delegate')
		} catch (err: any) {
			assert.ok(err.message.includes('403 post transactions: tx rejected: insufficient energy'));
		}
	});
})