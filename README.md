# web3-providers-connex
Web3.js provider implemented using Connex.js and Thor restful APIs. It makes it possible to use [web3.js](https://github.com/ChainSafe/web3.js) and [ethers.js](https://github.com/ethers-io/ethers.js/) to interact with [VeChain Thor protocol](https://github.com/vechain/thor).
## Installation
```
npm i web3-providers-connex
```
## Usage
To get a web3 object:
```ts
import * as thor from 'web3-providers-connex';

// connexObj is an instance of Connex
const provider = new thor.ProviderWeb3({ connex: connexObj });
const web3 = new Web3(provider);
```
To get an ethers JsonRpcProvider:
```ts
import * as thor from 'web3-providers-connex';

// connex is an instance of Connex
const provider = thor.ethers.modifyProvider(
  new ethers.providers.Web3Provider(
    new thor.ProviderEtheres({ connex: connex })
  )
);
```
To get an ethers JsonRpcSigner:
```ts
const signer = provider.getSigner(address);
```
To deploy a contract
```ts
const factory = thor.ethers.modifyFactory(
  new ethers.ContractFactory(abi, bin, signer)
);
const contract = await factory.deploy(...args);
```
Methods `modifyProvider` and `modifyFactory` are used to replace methods `jsonRpcProvider.sendTransaction` and `contractFactory.deploy` shipped with ethers.js to bypass the contract address computation that is incompatible with the Thor protocol.  

## Guides
### Request at a Particular Block Hight
There are a few Eth JSON-RPC APIs where users can specify a particular block height when requesting information [1]. To enable this feature, you need to provide a `Net` object when creating a `ConnexProvider` object as illustrated as follows:
```ts
import { SimpleNet } from '@vechain/connex-driver';
import * as thor from 'web3-providers-connex';

// url: thor node address (e.g., https://sync-mainnet.veblocks.net/)
const net = new SimpleNet(url);
const cp = new thor.ConnexProvider({ 
  connex: connexObj,
  net: net
});
```
For the default block number options [1], only `latest` and `earliest` are supported. The followings are the affected ETH JSON-RPC APIs: `eth_getBalance`, `eth_getCode`, `et_getStorageAt` and `eth_call`. 
### Fee delegation
Fee delegation can be enabled by passing the delegator URL to the `ConnexProvider` constructor:
```ts
import * as thor from 'web3-providers-connex';

const cp = new thor.ConnexProvider({
  connex: Obj,
  delegate: {
    url: 'https://delegator.url'
  }
})
```
or calling `enableDelegate`:
```ts
cp.enableDelegate({ url: 'https://delegator.url' });
```
You can also disable fee delegation by
```ts
cp.disableDelegate();
```
A delegator is a web service that co-signs and returns a signature for transactions it accepts. The gas fee would then be deducted from the delegator's account rather than the transaction sender's account. 

You can build your own delegator by implementing [VIP201](https://github.com/vechain/VIPs/blob/master/vips/VIP-201.md). Alternatively, you can use public fee delegation services (e.g., provided by [vechain.energy](https://vechain.energy)).
### Get a Connex instance in the Node.js environment
```ts
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';

const net = new SimpleNet(nodeUrl);
const wallet = new SimpleWallet();
// Import private key: 
wallet.import(privateKey)

const driver = await Driver.connect(net, wallet);
const connex = new Framework(driver);
```
### Examples
You can check [https://github.com/zzGHzz/web3-providers-connex/tree/main/test](https://github.com/zzGHzz/web3-providers-connex/tree/main/test) for more examples.

## Implemented ETH JSON-RPC APIs
The table below lists all the implemented JSON-RPC APIs. All the web3/ethers APIs that invoke the APIs are therefore available.

|ETH JSON-RPC API|Remark|
|:--|:--|
|`eth_estimateGas`|Args:<ul><li>`gasPrice` can be omitted</li></ul>|
|`eth_blockNumber`||
|`eth_getBalance`| Args:<ul><li>Default block parameter `pending` not supported |
|`eth_getBlockByNumber`<br>`eth_getBlockByHash`|Args:<ul><li>Default block parameter `pending` not supported</li></ul>Returned block object:<ul><li>`hash` [32 bytes] - Thor block ID</li><li>`transactions` [`Array<string>`] - always return transaction hashes</li><li>Unsupported fields: `difficulty`, `totalDifficulty`, `uncles`, `sha3Uncles`, `nonce`, `logsBloom`, `extraData`</li></ul>|
|`eth_chainId`||
|`eth_getCode`||
|`eth_getLogs`|Returned log object:<ul><li>Unsupported fields: `transactionIndex`, `logIndex`</li></ul>|
|`eth_getStorageAt`||
|`eth_getTransaction`|Returned transaction object:<ul><li>`hash` [32 bytes] - Thor transaction ID</li><li>Unsupported fields: `nonce`, `gasPrice`, `transactionIndex`, `maxPriorityFeePerGas`, `maxFeePerGas`</li></ul>|
|`eth_getTransactionReceipt`|Returned transaction receipt object:<ul><li> Unsupported fields: `transactionIndex`, `cumulativeGasUsed`, `from`, `to`, `logsBloom`</li></ul>|
|`eth_isSyncing`|If under syncing, returned object:<ul><li> `currentBlock` [`Number`]</li><li>`highestBlock` [`Number`]</li></ul>|
|`eth_sendTransaction`|Args:<ul><li>`txObj` includes fields: `from`, `to`, `value`, `data`, `gas`</li></ul>|
|`eth_call`|Args:<ul><li>`gasPrice` can be omitted</li></ul>|
|`eth_subscribe`<br>`eth_unsubscribe`|Args:<ul><li>Supported subscription type: `newHeads`, `logs`</li></ul>|
|`net_version` |Equivalent to `eth_chainId`|
|`eth_gasPrice` (dummy)|Return 0|
|`eth_getTransactionCount` (dummy)| Return 0|
## License
This software is licensed under the
[GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html), also included
in *LICENSE* file in repository.
## References
[1] [https://eth.wiki/json-rpc/API](https://eth.wiki/json-rpc/API).