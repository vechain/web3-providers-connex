import 'mocha'
import { assert } from 'chai'
import { Driver, Net, SimpleNet, SimpleWallet } from '@vechain/connex-driver'
import { urls, soloAccounts} from '../settings'
import * as thor from '../../src/index'
import { Framework } from '@vechain/connex-framework'

describe('Test the calculation of transactionIndex and logIndex', function () {
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

	it('sendAsync', async () => {
		const providerWeb3 = new thor.ProviderWeb3({
			connex: connex,
			wallet: wallet,
			net: net
		})
		providerWeb3.sendAsync(
			{method: 'evm_mine', id: 0, jsonrpc: '2.0'},
			err => assert.fail(err.message || err) 
		)			
	})
})