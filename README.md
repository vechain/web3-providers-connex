# web3-providers-connex
This project implements the JSON-RPC provider defined in [EIP-1193](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md) for the [VeChain Thor protocol](https://github.com/vechain/thor). The provider is made to be compatible with [web3.js](https://github.com/ChainSafe/web3.js) and [ethers.js](https://github.com/ethers-io/ethers.js), allowing developers to use the two libs to interact with a Thor node.

![Main (GH Actions)](https://github.com/vechain/web3-providers-connex/actions/workflows/unit-test-sonar-on-push.yml/badge.svg?branch=main)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vechain_web3-providers-connex&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vechain_web3-providers-connex)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=vechain_web3-providers-connex&metric=coverage)](https://sonarcloud.io/summary/new_code?id=vechain_web3-providers-connex)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=vechain_web3-providers-connex&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=vechain_web3-providers-connex)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=vechain_web3-providers-connex&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=vechain_web3-providers-connex)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=vechain_web3-providers-connex&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=vechain_web3-providers-connex)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=vechain_web3-providers-connex&metric=bugs)](https://sonarcloud.io/summary/new_code?id=vechain_web3-providers-connex)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=vechain_web3-providers-connex&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=vechain_web3-providers-connex)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=vechain_web3-providers-connex&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=vechain_web3-providers-connex)


## Installation
```
npm i @vechain/web3-providers-connex
```
## Examples
### Using EIP-1193 provider
Checking account balance
```ts
import { Provider } from '@vechain/web3-providers-connex'

// connexObj is an instance of Connex
const provider = new Provider({connex: connexObj})
const balance = await provider.request({ 
  method: 'eth_getBalance', 
  params: ['0x...'] 
})
```
Obtaining a connex instance in Node.js
```ts
import { Framework } from '@vechain/connex-framework'
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver'

const net = new SimpleNet(url-to-thor-node)
const wallet = new SimpleWallet()
// import private key if needed
wallet.import('0x...')
const driver = await Driver.connect(net, wallet)
const connexObj = new Framework(driver)
```
Sending VET
```ts
const txId = await provider.request({
  method: 'eth_sendTransaction',
  params: [{ 
    from: '0x...', 
    to: '0x...', 
    value: '0x...' 
  }]
})
```
### Working with `web3.js`:
```ts
import { ProviderWeb3 } from '@vechain/web3-providers-connex'
import { Web3 } from 'web3' 

const provider = new ProviderWeb3({ connex: connexObj })
const web3 = new Web3(provider)
```
### Working with `ethers.js`
```ts
import * as thor from '@vechain/web3-providers-connex'
import { ethers } from 'ethers'

const provider = thor.ethers.modifyProvider(
  new ethers.BrowserProvider(
    new thor.Provider({ 
      connex: connexObj,
      wallet: walletObj,	// MUST provide to call [getSigner] method 	 
    })
  )
)
```
Obtaining a signer
```ts
const signer = provider.getSigner(address)
```
Deploying a contract
```ts
const factory = thor.ethers.modifyFactory(
  new ethers.ContractFactory(abi, bin, signer)
)
const base = await factory.deploy(...args)
await base.waitForDeployment()

const contractAddress = await base.getAddress()
const contract = new ethers.Contract(contractAddress, abi, signer)
```
Methods `modifyProvider` and `modifyFactory` are used to patch the original code of [ethers.js](https://github.com/ethers-io/ethers.js) that is incompatible with the Thor protocol.  

### Request at a particular block hight
APIs `eth_getBalance`, `eth_getCode`, `eth_getStorageAt` and `eth_call` allow users to specify a particular block height [1]. To do that, we need to provide a `Net` object when creating a provider:
```ts
import { SimpleNet } from '@vechain/connex-driver'
import * as thor from '@vechain/web3-providers-connex'
import { Web3 } from 'web3'
import { ethers } from 'ethers'

const provider = new thor.Provider({ 
  connex: connexObj,
  net: netObj
})

const web3 = new Web3(
  new thor.ProviderWeb3({ 
    connex: connexObj,
    net: netObj
  })
)

const providerEthers = thor.ethers.modifyProvider(
  new ethers.BrowserProvider(
    new thor.Provider({ 
      connex: connexObj,
      net: netObj
    })
  )
)
```
### Fee delegation
Fee delegation can be enabled by passing the delegator URL when constructing an instance of `Provider`/`ProviderWeb3`:
```ts
import { Provider } from '@vechain/web3-providers-connex';

const provider = new Provider({
  connex: Obj,
  delegate: {
    url: url-to-delegator
  }
})
```
or calling `enableDelegate`:
```ts
provider.enableDelegate({ url: url-to-delegator });
```
You can also disable fee delegation by
```ts
provider.disableDelegate();
```
A delegator is a web service that co-signs and returns a signature for transactions it accepts. The gas fee would then be deducted from the delegator's account instead of the transaction sender's account. 

You can build your own delegator by implementing [VIP201](https://github.com/vechain/VIPs/blob/master/vips/VIP-201.md). See `/test/web3/feeDelegate.test.ts` for a quick demo.
### More Examples
More examples can be found in `/test/`

## Supported APIs
##### `eth_accounts`
##### `eth_blockNumber`
##### `eth_call`
##### `eth_estimateGas`
##### `eth_gasPrice`
Returning `0x0`
##### `eth_getBalance`
##### `eth_getBlockByNumber`
##### `eth_getBlockByHash`
##### `eth_chainId`
##### `eth_getCode`
##### `eth_getLogs`
##### `eth_getStorageAt`
##### `eth_getTransactionByHash`
##### `eth_getTransactionCount`
Returning `0x0`
##### `eth_getTransactionReceipt`
##### `eth_isSyncing`
##### `eth_requestAccounts`
##### `eth_sendRawTransaction`
Requiring passing a `Net` object when constructing an instance of `Provider` or `ProviderWeb3`
##### `eth_sendTransaction`
##### `eth_subscribe`, `eth_unsubscribe`
Supported subscription type: `newHeads`, `logs`
##### `evm_mine`
##### `net_version`
Equivalent to `eth_chainId`
##### `web3_clientVersion`
Returning string `thor`
##### `debug_traceTransaction`
##### `debug_traceCall`

## Implementation Notes
1. Fields `blockHash` and `transactionHash` return the values of [`blockId`](https://docs.vechain.org/thor/learn/block.html#block) and [`transactionId`](https://docs.vechain.org/thor/learn/transaction-model.html#transaction-id) defined in the Thor protocol, respectively
2. APIs `eth_estimateGas`, `eth_call`, `eth_getTransactionReceipt`, `debug_traceTransaction` and `debug_traceCall` only return information associated with the first [clause](https://docs.vechain.org/thor/learn/transaction-model.html#clauses) in a transaction
3. Unsupported returning fields (all set to zero):
* `cumulativeGasUsed`
* `difficulty`
* `gasPrice`
* `logsBloom`
* `nonce`
* `sha3Uncles`
* `totalDifficulty`
4. For the default block number options [1], only `latest` and `earliest` are supported
## License
This software is licensed under the
[GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html), also included
in *LICENSE* file in repository.
## References
[1] [https://eth.wiki/json-rpc/API](https://eth.wiki/json-rpc/API).
