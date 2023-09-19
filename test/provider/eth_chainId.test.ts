import "mocha";
import { expect, assert } from "chai";
import { TestObject } from "../testSetup";

describe('Test function eth_chainId', function () {
	it('should return the correct mainnet genesis id', async function () {
		const { eip1193Providers, connexs } = this.testObject as TestObject;
		const provider = eip1193Providers.main;
		const connex = connexs.main;

		try {
			const id = await provider.request({ method: 'eth_chainId' });
			expect(id).to.eql(connex.thor.genesis.id);
		} catch (err: any) {
			assert.fail(err.message || err);
		}
	})
});