import 'mocha'
import { expect, assert } from 'chai'
import { Driver, Net, SimpleNet, SimpleWallet } from '@vechain/connex-driver'
import { urls, soloAccounts } from '../settings'
import * as thor from '../../src/index'
import { Framework } from '@vechain/connex-framework'

describe('Test scenarios when errors are generated', function () {
	let driver: Driver
	let provider: thor.Provider
	let wallet: SimpleWallet
	let connex: Connex
	let net: Net

	before(async function () {
		net = new SimpleNet(urls.solo)
		wallet = new SimpleWallet()
		soloAccounts.forEach(pk => {
			wallet.import(pk)
		})

		try {
			driver = await Driver.connect(net, wallet)
			connex = new Framework(driver)
			provider = new thor.Provider({
				connex: connex,
				net: net,
				wallet: wallet
			})
		} catch (err: any) {
			assert.fail(err.message || err)
		}
	})

	after(function () {
		driver.close()
	})

	it('method not found', async () => {
		const method = 'MethodNotFound'
		try {
			await provider.request({ method: method })
			assert.fail('Test failed')
		} catch (err: any) {
			expect(err.message || err).to.eql(`Method ${method} not found`)
		}
	})

	it('method not implemented', async () => {
		const method = 'eth_coinbase'
		try {
			await provider.request({ method: method })
			assert.fail('Test failed')
		} catch (err: any) {
			expect(err.message || err).to.eql(`Method ${method} not implemented`)
		}
	})

	it('invalid subscription name', async () => {
		const name = "InvalidName"
		try {
			await provider.request({ method: 'eth_subscribe', params: [name] })
			assert.fail('Test failed')
		} catch (err: any) {
			expect(err.message).to.eql(thor.ErrMsg.InvalidSubscriptionName(name))
		}
	})

	it('subscription id not found', async () => {
		const subId = 'InvalidSubId'
		try {
			await provider.request({ method: 'eth_unsubscribe', params: [subId] })
			assert.fail('Test failed')
		} catch (err: any) {
			expect(err.message).to.eql(thor.ErrMsg.SubscriptionIdNotFound(subId))
		}
	})

	it('input params missing', async () => {
		try{
			await provider.request({method: "eth_getBlockByNumber"})
			assert.fail('Test failed')
		}catch(err: any) {
			expect(err.message).to.eql('Parameters missing')
		}
	})

	it('invalid block hash when calling eth_getBlockByHash', async () => {
		const hash = 'InvalidBlockHash'
		try {
			await provider.request({method: 'eth_getBlockByHash', params: [hash]})
			assert.fail('Test failed')
		} catch(err:any) {
			expect(err.message).to.eql(thor.ErrMsg.ArgumentMissingOrInvalid('eth_getBlockByNumber', 'blockHash'))
		}
	})

	it('invalid hex string for raw tx', async() => {
		const raw = 'InvalidRawTx'
		try {
			await provider.request({method: 'eth_sendRawTransaction', params: [raw]})
			assert.fail('Test failed')
		} catch(err:any) {
			expect(err.message).to.eql(thor.ErrMsg.ArgumentMissingOrInvalid('eth_sendRawTransaction', 'raw'))
		}
	})

	it('invalid raw tx', async() => {
		const raw = '0x0123456789'
		try {
			await provider.request({method: 'eth_sendRawTransaction', params: [raw]})
			assert.fail('Test failed')
		} catch(err:any) {
			expect(err.message).to.eql('400 post transactions: raw: rlp: expected input list for tx.body')
		}
	})

	it('invalid fromBlock when calling eth_getLogs', async () => {
		const fromBlock = 'InvalidFromBlock'
		try {
			await provider.request({method: 'eth_getLogs', params: [{fromBlock: fromBlock}]})
			assert.fail('Test failed')
		} catch(err:any) {
			expect(err.message).to.eql(thor.ErrMsg.ArgumentMissingOrInvalid('eth_getLogs', 'options.fromBlock'))
		}
	})

	it('invalid toBlock when calling eth_getLogs', async () => {
		const toBlock = 'InvalidToBlock'
		try {
			await provider.request({method: 'eth_getLogs', params: [{toBlock: toBlock}]})
			assert.fail('Test failed')
		} catch(err:any) {
			expect(err.message).to.eql(thor.ErrMsg.ArgumentMissingOrInvalid('eth_getLogs', 'options.toBlock'))
		}
	})

	it('invalid revision', async () => {
		const revision = 'InvalidRevision'
		const methods = [
			'eth_getCode',
			'eth_getStorageAt',
			'eth_getBalance',
			'eth_call'
		]
		const params = [
			['0x', revision],
			['0x', '0x', revision],
			['0x', revision],
			[{}, revision]
		]
		methods.forEach(async (method, i) => {
			try {
				await provider.request({method: method, params: params[i]})
				assert.fail('Test failed')
			} catch(err:any) {
				expect(err.message).to.eql(thor.ErrMsg.ArgumentMissingOrInvalid(method, 'revision'))
			}
		})
	})
})