import 'mocha'
import { expect, assert } from 'chai'
import { Driver, SimpleWallet, SimpleNet } from '@vechain/connex-driver'
import { Framework } from '@vechain/connex-framework'
import { secp256k1 } from 'thor-devkit'
import { ConnexProvider } from '../../src/index'
import { soloAccounts, urls } from '../settings'

describe('Test eth_accounts', function () {
	const net = new SimpleNet(urls.solo)

	it('Init provider with undefined wallet', async function () {
		let driver: Driver | undefined
		try {
			const wallet = new SimpleWallet()
			driver = await Driver.connect(net, wallet)
			const connex = new Framework(driver)

			const provider = new ConnexProvider({ connex: connex })

			const accounts: string[] = await provider.request({ method: 'eth_accounts' })
			expect(accounts).to.eql([])
		} catch (err: any) {
			assert.fail(err.message || err)
		} finally {
			if (driver) {
				driver.close()
			}
		}
	})
	it('Init provider with empty wallet', async function () {
		let driver: Driver | undefined
		try {
			const wallet = new SimpleWallet()
			driver = await Driver.connect(net, wallet)
			const connex = new Framework(driver)

			const provider = new ConnexProvider({ connex: connex, wallet: wallet })

			const accounts: string[] = await provider.request({ method: 'eth_accounts' })
			expect(accounts).to.eql([])
		} catch (err: any) {
			assert.fail(err.message || err)
		} finally {
			if (driver) {
				driver.close()
			}
		}
	})
	it('Init provider with non-empty wallet', async function () {
		let driver: Driver | undefined
		try {
			const wallet = new SimpleWallet()
			soloAccounts.forEach(pk => {
				wallet.import(pk)
			})
			const pubs = soloAccounts.map(
				pk => '0x' + secp256k1.derivePublicKey(Buffer.from(pk.substring(2), 'hex')).toString('hex'))

			driver = await Driver.connect(net, wallet)
			const connex = new Framework(driver)

			const provider = new ConnexProvider({ connex: connex, wallet: wallet })

			const accounts: string[] = await provider.request({ method: 'eth_accounts' })
			accounts.forEach(addr => expect(pubs.indexOf(addr)).not.to.eql(-1))
		} catch (err: any) {
			assert.fail(err.message || err)
		} finally {
			if (driver) {
				driver.close()
			}
		}
	})
})