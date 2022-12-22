import 'mocha'
import { expect, assert } from 'chai'
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver'
import { urls, soloAccounts, abi, bin } from '../settings'
import * as thor from '../../src/index'
import { Framework } from '@vechain/connex-framework'
import { ethers } from 'ethers'

describe('Test the calculation of transactionIndex and logIndex', function () {
	let driver: Driver
	let provider: thor.Provider
	let providerEthers: ethers.providers.JsonRpcProvider
	let wallet: SimpleWallet
	let connex: Connex
	let txIds: string[]

	before(async function () {
		const net = new SimpleNet(urls.solo)
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
			providerEthers = thor.ethers.modifyProvider(
				new ethers.providers.Web3Provider(provider)
			)

			const txRes = await setup()
			txIds = txRes.map(res => res.txid)
			await provider.request({ method: 'evm_mine' })
		} catch (err: any) {
			assert.fail(err.message || err)
		}
	})

	after(function () {
		driver.close()
	})

	/**
	 * To set up a block that contain three transactions:
	 * 	Tx1: 
	 * 		VET transfer 
	 * 	   	set(0, 'clause0')	==> Emit 	"Set" from contract "Test1" 
	 * 								 		"Set" from contract "Test"
	 * 	   	set(1, 'clause1')	==> Emit 	"Set" from contract "Test1" 
	 * 								 		"Set" from contract "Test"
	 *  Tx2: 
	 * 		set(2, 'clause2')	==> Emit 	"Set" from contract "Test1" 
	 * 								 		"Set" from contract "Test"
	 *  Tx3: 
	 * 		set(3, 'clause3')	==> Emit 	"Set" from contract "Test1" 
	 * 								 		"Set" from contract "Test"
	 * 		set(4, 'clause4')	==> Emit 	"Set" from contract "Test1" 
	 * 								 		"Set" from contract "Test"
	 */
	async function setup() {
		const factory = thor.ethers.modifyFactory(
			new ethers.ContractFactory(abi, bin, providerEthers.getSigner(wallet.list[0].address))
		)
		try {
			// deploy contract
			const contract = await factory.deploy(...[0, 'deploy'])
			await contract.deployTransaction.wait()

			// Get ABI for contract function "set"
			const setABI = abi.find(abi => abi.name === "set" && abi.type === "function")

			let txRes: Connex.Vendor.TxResponse[] = []
			const clauses: any[] = []
			for (let i = 0; i < 5; i++) {
				clauses[i] = connex.thor.account(contract.address).method(setABI).asClause(i * 100, `clause ${i}`)
			}

			// Send a tx with 3 clauses with the 1st transferring VET 
			// and the rest calling contract function "set"
			driver.txParams.gasPriceCoef = 255
			txRes[0] = await connex.vendor.sign('tx', [
				{ to: wallet.list[2].address, value: '1000000000000000000', data: '0x' },
				{ ...clauses[0] }, { ...clauses[1] }
			]).signer(wallet.list[1].address).request()

			// Send a tx with a single clause that calls function "set" 
			driver.txParams.gasPriceCoef = 128
			txRes[1] = await connex.vendor.sign('tx', [{ ...clauses[2] }])
				.signer(wallet.list[1].address)
				.request()

			// Send a tx with 2 clausese that call contract function "set"
			driver.txParams.gasPriceCoef = 0
			txRes[2] = await connex.vendor.sign('tx', [
				{ ...clauses[3] }, { ...clauses[4] }
			])
				.signer(wallet.list[2].address)
				.request()

			return txRes
		} catch (err: any) {
			assert.fail(err.message || err)
		}
	}

	it('Test eth_getTransactionReceipt', async function () {
		try {
			const rec1 = await providerEthers.getTransactionReceipt(txIds[1])
			const rec2 = await providerEthers.getTransactionReceipt(txIds[2])
			expect(rec1.blockHash).to.eql(rec2.blockHash)

			rec1.logs.forEach((log, i) => {
				const offset = 4
				expect(log.transactionIndex).to.eql(1)
				expect(log.logIndex).to.eql(offset + i)
			})

			rec2.logs.forEach((log, i) => {
				const offset = 6
				expect(log.transactionIndex).to.eql(2)
				expect(log.logIndex).to.eql(offset + i)
			})
		} catch (err: any) {
			assert.fail(err.message || err)
		}
	})

	it('Test eth_getLogs', async () => {
		try {
			const setSig = ethers.utils.keccak256(Buffer.from('Set(address,uint256,string)'))
			const receipt = await providerEthers.getTransactionReceipt(txIds[0])

			// No topics
			let logs = await providerEthers.getLogs({
				fromBlock: receipt.blockNumber,
				toBlock: receipt.blockNumber
			})
			expect(logs.length).to.eql(10)

			logs = await providerEthers.getLogs({
				fromBlock: receipt.blockNumber,
				toBlock: receipt.blockNumber,
				topics: [setSig]
			})

			expect(logs.length).to.eql(5);
			logs.forEach(log => {
				if ((log.transactionHash === txIds[0])) {
					expect(log.transactionIndex).to.eql(0)
					expect(log.logIndex).to.be.oneOf([1, 3])
				}
				else if (log.transactionHash === txIds[1]) {
					expect(log.transactionIndex).to.eql(1)
					expect(log.logIndex).to.eql(5)
				} else {
					expect(log.transactionIndex).to.eql(2)
					expect(log.logIndex).to.be.oneOf([7, 9])
				}
			})
		} catch (err: any) {
			assert.fail(err.message || err)
		}

	})
})