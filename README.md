# web3-providers-connex
Web3.js provider implemented using Connex.js. It makes possible to use web3.js to interact with the VeChain Thor protocol.
## Usage
```ts
const provider = new ConnexProvider(connex); // connex is an object of Connex
const web3 = new Web3(provider);
```
## APIs Implemented
### For All
* Argument `defaultBlock` is not supported;
* Predefined block number `pending` is not supported;
* Object property `thor` contains the corresponding data requested by Connex.js.
* Object property `transactionHash` is set to the correspoding Thor transaction ID;
* Object property `blockHash` is set to the corresponding Thor block ID;
### web3.eth
#### isSyncing
The returned sync object:

* `currentBlock` [`Number`]
* `highestBlock` [`Number`]
* `thor` [`Connex.Thor.Status`] - Data returned by `connex.thor.status`.

#### getBlockNumber
#### getBalance
```
web3.eth.getBalance(address [, callback])
```

#### getStorageAt
```
web3.eth.getStorageAt(address, position [, callback])
```

#### getCode
```
web3.eth.getCode(address [, callback])
```

#### getBlock
```
web3.eth.getBlock(blockHashOrBlockNumber [, callback])
```

The returned block object:

* `hash` [32 bytes] - Thor block ID;
* `transactions` - Array of transaction IDs;
* Unsupported properties `difficulty`, `totalDifficulty`, `uncles`, `sha3Uncles`, `nonce`, `logsBloom`, `extraData` and `baseFeePerGas` - `null | undefined`;
* `thor` [`Connex.Thor.Block`].

#### getTransaction
The returned transaction object:
* `hash` - Thor transaction ID;
* Unsupported properties `nonce`, `gasPrice`, `transactionIndex`, `maxPriorityFeePerGas` and `maxFeePerGas` - `null | undefined`;
* `thor` [`Connex.Thor.Transaction`].

#### getTransactionReceipt
The returned log object:
* Unsupported properties `transactionIndex` and `logIndex` - `null`.

The returned transaction receipt object:
* Unsupported properties `from`, `to`, `transactionIndex`, `cumulativeGasUsed`, `effectiveGasPrice`, `logsBloom` and `events` - `null | undefined`;
* `thor` [Connex.Thor.Transaction.Receipt].  

#### sendTransaction
The input transaction object:
* Supported properties `from`, `to`, `value`, `data`, `gas`. 

#### call
```
web3.eth.call(callObject [, callback])
```
The input transaction object is defined in the same way as `sendTranaction`.

#### estimateGas

#### getPastLogs
The log object:
* Unsupported properties `transactionIndex` and `logIndex` - `null`.

### web3.eth.subscribe
#### web3.eth.subscribe('newBlockHeaders')
The returned header object:
* Unsupported properties `sha3Uncles`, `nonce`, `logsBloom`, `extraData` and `baseFeePerGas` - `null | undefined`;
#### web3.eth.subscribe('logs')
The returned log object:
* Unsupported properties `transactionIndex` and `logIndex` - `null`.

## Examples
See [tests](https://github.com/zzGHzz/web3-providers-connex/tree/main/test) for more examples.

## License
This software is licensed under the
[GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html), also included
in *LICENSE* file in repository.
