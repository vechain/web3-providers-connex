'use strict';

import 'mocha';
import { expect, assert } from 'chai';
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';
import { ProviderWeb3 } from '../../src/index';
import { urls, soloAccounts, abi, bin } from '../settings';
import Web3 from 'web3';
import { DelegateOpt } from '../../src/types';
import http from 'http';
import { Transaction } from 'thor-devkit';

describe('Testing fee delegate', () => {
	const net = new SimpleNet(urls.solo);
	const wallet = new SimpleWallet();

	let driver: Driver;
	let provider: ProviderWeb3;
	let web3: any;
	let srv: http.Server;

	before(async () => {
		try {
			driver = await Driver.connect(net, wallet);
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

	after(() => {
		driver?.close();
		srv?.close();
	})

	it('deploy contract', async () => {
		const opt: DelegateOpt = {
			url: 'http://localhost:8000'
		}
		provider.enableDelegate(opt);

		let contract = new web3.eth.Contract(abi);
		const args = [100, 'test contract deploy'];
		const from = wallet.list[0].address;

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