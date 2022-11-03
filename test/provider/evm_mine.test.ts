import 'mocha'
import { expect, assert } from 'chai'
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver'
import { urls, soloAccounts } from '../settings'
import { ConnexProvider, ethers } from '../../src'
import { Framework } from '@vechain/connex-framework'

describe('Test custom JSON RPC methods', function () {
	let driver: Driver
	let provider: ConnexProvider

	before(async function () {
		const net = new SimpleNet(urls.solo)
		const wallet = new SimpleWallet()
		soloAccounts.forEach(pk => {
			wallet.import(pk)
		})

		try {
			driver = await Driver.connect(net, wallet)
			const connex = new Framework(driver)
			provider = new ConnexProvider({
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

	it('Test evm_mine', async function () {
		const n1 = await provider.request({ method: 'eth_blockNumber' })
		await provider.request({ method: 'evm_mine' })
		const n2 = await provider.request({ method: 'eth_blockNumber' })
		expect(parseInt(n2, 16)).to.eql(parseInt(n1, 16) + 1)
	})
})