# web3-providers-connex
Web3.js provider implemented using Connex.js. It makes it possible to use [web3.js](https://github.com/ChainSafe/web3.js) and [ethers.js](https://github.com/ethers-io/ethers.js/) to interact with [VeChain Thor protocol](https://github.com/vechain/thor).
## Installation
```
npm i web3-providers-connex
```
## Usage
To get a web3 object:
```ts
import * as thor from 'web3-providers-connex';

// connex is an object of Connex
const provider = new thor.ConnexProvider({ connex: connex });
const web3 = new Web3(provider);
```
To get an ethers JsonRpcProvider:
```ts
import * as thor from 'web3-providers-connex';

// connex is an instance of Connex
const provider = thor.ethers.modifyProvider(
	new ethers.providers.Web3Provider(
		new thor.ConnexProvider({ connex: connex })
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
## APIs
The two tables below list all the supported APIs:
|web3.js API|Remark|
|:--|:--|
|`web3.eth.estimateGas(callObject [, callback])`|Args:<ul><li>`callObject` includes properties: `from`, `to`, `value`, `data`, `gas`</li></ul>|
|`web3.eth.getBlockNumber([callback])`||
|`web3.eth.getBalance(address [, callback])`||
|`web3.eth.getBlock(hashOrNumber [, callback])`|Args:<ul><li>`hashOrNumber` cannot be "pending"</li></ul>Returned block object:<ul><li>`hash` [32 bytes] - Thor block ID</li><li>`transactions` [`Array<string>`] - always return transaction hashes</li><li>`null` properties `difficulty`, `totalDifficulty`, `uncles`, `sha3Uncles`, `nonce`, `logsBloom`, `extraData`, `baseFeePerGas` [`null | undefined`]</li><li>`thor` [[`Connex.Thor.Block`](https://docs.vechain.org/connex/api.html#thor-block)]</li></ul>|
|`jsonRpcProvider.getChainId()`||
|`jsonRpcProvider.getCode(address [, callback])`||
|`web3.eth.getPastLogs(options [, callback])`|Returned log object:<ul><li>1. `transactionIndex = -1`</li><li>2. `logIndex = -1`</li></ul>|
|`web3.eth.getStorageAt(address, position [, callback])`||
|`web3.eth.getTransaction(txHash [, callback])`|Returned transaction object:<ul><li>`hash` - Thor transaction ID<li>`nonce = -1`<li>`null` properties: `gasPrice`, `transactionIndex`<li>`undefined` properties: `maxPriorityFeePerGas`, `maxFeePerGas`<li>`thor` [[`Connex.Thor.Transaction`](https://docs.vechain.org/connex/api.html#thor-transaction)]|
|`web3.eth.getTransactionReceipt(hash [, callback])`|Returned transaction receipt object:<ul><li>`transactionIndex = -1`</li><li>`cumulativeGasUsed = -1`</li><li>`null` properties: `from`, `to`, `cumulativeGasUsed`, `effectiveGasPrice`</li><li>`undefined` properties: `logsBloom`, `events`</li><li>`thor` [[`Connex.Thor.Transaction.Receipt`](https://docs.vechain.org/connex/api.html#thor-receipt)]</li></ul>Returned log object:<ul><li>`transactionIndex = -1`</li><li>`logIndex = -1`</li></ul>|
|`web3.eth.isSyncing([callback])`|If under syncing, returned object:<br>1. `currentBlock` [`Number`]<br>2. `highestBlock` [`Number`]<br>3. `thor` [[`Connex.Thor.Status`](https://docs.vechain.org/connex/api.html#thor-status)]|
|`web3.eth.sendTransaction(txObject [, callback])`|Args:<ul><li>`txObject` includes properties: `from`, `to`, `value`, `data`, `gas`</li></ul>|
|`web3.eth.call(callObject [, callback])`|Args:<ul><li>`callObject` includes properties: `from`, `to`, `value`, `data`, `gas`</li></ul>|
|`web3.eth.subscribe(type [, options] [, callback])`|Args:<ul><li>`type = "newBlockHeaders | logs"`</li></ul>|
|`web3.eth.Contract`||

|ethers.js API|Remark|
|:--|:--|
|`jsonRpcProvider.estimateGas(transaction)`||
|`jsonRpcProvider.getBlockNumber()`||
|`jsonRpcProvider.getBalance(address)`||
|`jsonRpcProvider.getBlock(block)`||
|`jsonRpcProvider.getCode(address)`||
|`jsonRpcProvider.getLogs(filter)`||
|`jsonRpcProvider.getStorageAt(address, pos)`||
|`jsonRpcProvider.getTransaction(hash)`||
|`jsonRpcProvider.getTransactionReceipt(hash)`||
|`jsonRpcProvider.getSigner(address)`||
|`jsonRpcProvider.sendTransaction(transaction)`|This method is re-implemented via calling `modifyProvider`|
|`jsonRpcProvider.call(transaction)`||
|`ethers.Contract`||
|`ethers.ContractFactory`|Method `contractFactory.deploy` is re-implemented via calling `modifyFactory`|
## FAQs
### Request at a Particular Block Hight
There are a few Eth JSON-RPC APIs where users can specify a particular block height when requesting information [1]. To enable this feature, you need to provide a `Net` object when creating a `ConnexProvider` object as illustrated as follows:
```ts
import { SimpleNet } from '@vechain/connex-driver';
import * as thor from 'web3-providers-connex';

// url: thor node address (e.g., https://sync-mainnet.veblocks.net/)
const net = new SimpleNet(url);
// connex: a Connex instance
const provider = thor.ethers.modifyProvider(
	new ethers.providers.Web3Provider(
		new thor.ConnexProvider({ 
			connex: connex,
			net: net
		})
	)
);
```
For the default block number options [1], only `latest` and `earliest` are supported. The followings are the affected APIs: `lib.getBalance`, `lib.getCode`, `lib.getStorageAt` and `lib.call` where `lib` is either `web3.eth` or `jsonRpcProvider`. 
### Get a Connex instance in the Node.js environment
```ts
import { Framework } from '@vechain/connex-framework';
import { Driver, SimpleNet, SimpleWallet } from '@vechain/connex-driver';

const net = new SimpleNet(nodeUrl);
const wallet = new SimpleWallet();
// Import private key: 
wallet.import(pk)

const driver = await Driver.connect(net, wallet);
const connex = new Framework(driver);
```
### Examples
You can check [https://github.com/zzGHzz/web3-providers-connex/tree/main/test](https://github.com/zzGHzz/web3-providers-connex/tree/main/test) for more examples.

## License
This software is licensed under the
[GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html), also included
in *LICENSE* file in repository.
## References
[1] [https://eth.wiki/json-rpc/API](https://eth.wiki/json-rpc/API).