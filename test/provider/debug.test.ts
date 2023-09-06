import 'mocha'
import { expect, assert } from 'chai'
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver'
import { soloAccounts, urls } from '../settings'
import { Provider } from '../../src'
import { Framework } from '@vechain/connex-framework'

describe('Test debug namespace methods', function () {
	let driver: Driver
	let provider: Provider

	before(async () => {
		const net = new SimpleNet(urls.testnet)
		const wallet = new SimpleWallet()

		try {
			driver = await Driver.connect(net, wallet)
			const connex = new Framework(driver)
			provider = new Provider({
				connex: connex,
				net: net,
				wallet: wallet
			})
		} catch (err: any) {
			assert.fail(err.message || err)
		}
	})

	after(() => {
		driver.close()
	})


	it('no rest should throw error', async () => {
		const p = new Provider({ connex: new Framework(driver) })

		let error: Error | undefined = undefined
		try {
			await p.request({ method: 'debug_traceTransaction', params: [] })
		} catch (e) {
			error = (e as Error)
		}
		expect(error).to.be.an('Error')

		error = undefined
		try {
			await p.request({ method: 'debug_traceCall', params: [] })
		} catch (e) {
			error = (e as Error)
		}
		expect(error).to.be.an('Error')

	})


	it('invalid revision', async () => {
		let error: Error | undefined = undefined
		try {
			await provider.request({
				method: 'debug_traceCall', params: [
					{}, 'x', {}
				]
			})
		} catch (e) {
			error = (e as Error)
		}
		expect(error).to.be.an('Error')
	})

	describe('Test trace transaction', function () {
		it('call tracer', async () => {
			let ret = await provider.request({
				method: 'debug_traceTransaction',
				params: [
					'0x0050c856835d72c00974eb53fb249e261f31c4a4b1ca107e8fca8198f0fb7aa4',
					{
						tracer: 'call'
					}
				]
			})

			expect(ret).to.haveOwnProperty('calls')
			expect(ret.calls).to.be.an('array')
			expect(ret).to.haveOwnProperty('type')
			expect(ret.type).to.equal('CALL')

			ret = await provider.request({
				method: 'debug_traceTransaction',
				params: [
					'0x0050c856835d72c00974eb53fb249e261f31c4a4b1ca107e8fca8198f0fb7aa4',
					{
						tracer: 'call',
						tracerConfig: {
							onlyTopCall: true
						}
					}
				]
			})
			expect(ret).to.not.haveOwnProperty('calls')
		})

		it('struct logger', async () => {
			let ret = await provider.request({
				method: 'debug_traceTransaction',
				params: [
					'0x0050c856835d72c00974eb53fb249e261f31c4a4b1ca107e8fca8198f0fb7aa4',
					{
						tracer: ''
					}
				]
			})

			expect(ret).to.haveOwnProperty('returnValue')
			expect(ret).to.haveOwnProperty('structLogs')
			expect(ret.structLogs).to.be.an('array')
			expect(ret.structLogs[0]).to.haveOwnProperty('stack')

			ret = await provider.request({
				method: 'debug_traceTransaction',
				params: [
					'0x0050c856835d72c00974eb53fb249e261f31c4a4b1ca107e8fca8198f0fb7aa4',
					{
						tracer: '',
						config: {
							disableStack: true
						}
					}
				]
			})

			expect(ret.structLogs[0]).to.not.haveOwnProperty('stack')
		})
	})

	describe('Test trace call', function () {
		let solo: Provider
		let soloDriver: Driver

		const wallet = new SimpleWallet()
		wallet.import(soloAccounts[0])

		before(async () => {
			const net = new SimpleNet(urls.solo)

			try {
				soloDriver = await Driver.connect(net, wallet)
				const connex = new Framework(soloDriver)
				solo = new Provider({
					connex: connex,
					net: net,
					wallet: wallet
				})
			} catch (err: any) {
				assert.fail(err.message || err)
			}
		})

		after(function () {
			soloDriver.close()
		})

		it('normalize args', async () => {
			let ret = await solo.request({
				method: 'debug_traceCall',
				params: [
					{
						from: wallet.list[0].address,
						gas: '0x100000',
					},
					'latest',
					{
						tracer: 'call',
					}
				]
			})
			expect(ret).to.not.haveOwnProperty('calls')
		})

		it('call tracer', async () => {
			let ret = await solo.request({
				method: 'debug_traceCall',
				params: [
					{
						from: wallet.list[0].address,
						to: '0x0000000000000000000000000000456e65726779',
						data: '0xa9059cbb000000000000000000000000bec38ea2338a4dafc246eb7eaf1b81e8a15d635400000000000000000000000000000000000000000000003635c9adc5dea00000'
					},
					'latest',
					{
						tracer: 'call'
					}
				]
			})

			expect(ret).to.haveOwnProperty('calls')
			expect(ret.calls).to.be.an('array')
			expect(ret).to.haveOwnProperty('type')
			expect(ret.type).to.equal('CALL')

			ret = await solo.request({
				method: 'debug_traceCall',
				params: [
					{
						from: wallet.list[0].address,
						to: '0x0000000000000000000000000000456e65726779',
						data: '0xa9059cbb000000000000000000000000bec38ea2338a4dafc246eb7eaf1b81e8a15d635400000000000000000000000000000000000000000000003635c9adc5dea00000'
					},
					'latest',
					{
						tracer: 'call',
						tracerConfig: {
							onlyTopCall: true
						}
					}
				]
			})
			expect(ret).to.not.haveOwnProperty('calls')
		})

		it('struct logger', async () => {
			let ret = await solo.request({
				method: 'debug_traceCall',
				params: [
					{
						from: wallet.list[0].address,
						to: '0x0000000000000000000000000000456e65726779',
						data: '0xa9059cbb000000000000000000000000bec38ea2338a4dafc246eb7eaf1b81e8a15d635400000000000000000000000000000000000000000000003635c9adc5dea00000'
					},
					'latest',
					{
						tracer: ''
					}
				]
			})

			expect(ret).to.haveOwnProperty('returnValue')
			expect(ret).to.haveOwnProperty('structLogs')
			expect(ret.structLogs).to.be.an('array')
			expect(ret.structLogs[0]).to.haveOwnProperty('stack')

			ret = await solo.request({
				method: 'debug_traceCall',
				params: [
					{
						from: wallet.list[0].address,
						to: '0x0000000000000000000000000000456e65726779',
						data: '0xa9059cbb000000000000000000000000bec38ea2338a4dafc246eb7eaf1b81e8a15d635400000000000000000000000000000000000000000000003635c9adc5dea00000'
					},
					'latest',
					{
						tracer: '',
						config: {
							disableStack: true
						}
					}
				]
			})

			expect(ret.structLogs[0]).to.not.haveOwnProperty('stack')
		})
	})

})