import 'mocha'
import { expect, assert } from 'chai'
import {
	BrowserProvider,
	ContractFactory,
	keccak256,
	Log
} from 'ethers'
import { TestObject } from '../testSetup'
import { modifyFactory, modifyProvider } from '../../src/ethers'

describe('Test the calculation of transactionIndex and logIndex', function () {
	let txIds: string[]

	before(async function () {
		const { eip1193Providers } = this.testObject as TestObject
		this.provider = modifyProvider(new BrowserProvider(eip1193Providers.solo))

		try {
			const txRes = await setup({ testObject: this.testObject })
			txIds = txRes.map(res => res.txid)
			await eip1193Providers.solo.request({ method: 'evm_mine' })
		} catch (err: any) {
			assert.fail(err.message || err)
		}
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
	const setup = async function (thisObj: { testObject: TestObject }) {
		const { abi, bin, wallet, eip1193Providers, drivers, connexs } = thisObj.testObject
		const provider = modifyProvider(new BrowserProvider(eip1193Providers.solo))
		const driver = drivers.solo
		const connex = connexs.solo

		const signer = await provider.getSigner(wallet.list[0].address)
		const factory = modifyFactory(
			new ContractFactory(abi, bin, signer)
		)
		try {
			// deploy contract
			const base = await factory.deploy(...[0, 'deploy'])
			await base.waitForDeployment();

			const contractAddress = await base.getAddress()

			// Get ABI for contract function "set"
			const setABI = abi.find(abi => abi.name === "set" && abi.type === "function")

			let txRes: Connex.Vendor.TxResponse[] = []
			const clauses: any[] = []
			for (let i = 0; i < 5; i++) {
				clauses[i] = connex.thor.account(contractAddress).method(setABI).asClause(i * 100, `clause ${i}`)
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
			const rec1 = await (this.provider as BrowserProvider).getTransactionReceipt(txIds[1])
			const rec2 = await (this.provider as BrowserProvider).getTransactionReceipt(txIds[2])
			expect(rec1).not.to.be.null
			expect(rec2).not.to.be.null
			expect(rec1?.blockHash).to.eql(rec2?.blockHash)

			rec1?.logs.forEach((log, i) => {
				const offset = 4
				expect(log.transactionIndex).to.eql(1)
				expect(log.index).to.eql(offset + i)
			})

			rec2?.logs.forEach((log, i) => {
				const offset = 6
				expect(log.transactionIndex).to.eql(2)
				expect(log.index).to.eql(offset + i)
			})
		} catch (err: any) {
			assert.fail(err.message || err)
		}
	})

	it('Test eth_getLogs', async function () {
		try {
			const setSig = keccak256(Buffer.from('Set(address,uint256,string)'))
			const receipt = await this.provider.getTransactionReceipt(txIds[0])

			// No topics
			let logs: Log[] = await this.provider.getLogs({
				fromBlock: receipt.blockNumber,
				toBlock: receipt.blockNumber
			})
			expect(logs.length).to.eql(10)

			logs = await this.provider.getLogs({
				toBlock: receipt.blockNumber,
				topics: [setSig]
			})

			expect(logs.length).to.eql(5);
			logs.forEach(log => {
				if ((log.transactionHash === txIds[0])) {
					expect(log.transactionIndex).to.eql(0)
					expect(log.index).to.be.oneOf([1, 3])
				}
				else if (log.transactionHash === txIds[1]) {
					expect(log.transactionIndex).to.eql(1)
					expect(log.index).to.eql(5)
				} else {
					expect(log.transactionIndex).to.eql(2)
					expect(log.index).to.be.oneOf([7, 9])
				}
			})
		} catch (err: any) {
			assert.fail(err.message || err)
		}

	})
})