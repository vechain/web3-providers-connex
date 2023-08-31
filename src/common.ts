'use strict'

import { ZeroBytes8, ZeroBytes20, ZeroBytes32, ZeroBytes256 } from "./types"

export const zeroBytes8: ZeroBytes8 = '0x0000000000000000'
export const zeroBytes20: ZeroBytes20 = '0x0000000000000000000000000000000000000000'
export const zeroBytes32: ZeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const zeroBytes256: ZeroBytes256 = '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

export const EthJsonRpcMethods = [
	'eth_accounts',
	'eth_blockNumber',
	'eth_call',
	'eth_chainId',
	'eth_coinbase',
	'eth_estimateGas',
	'eth_feeHistory',
	'eth_gasPrice',
	'eth_getBalance',
	'eth_getBlockByHash',
	'eth_getBlockByNumber',
	'eth_getBlockTransactionCountByHash',
	'eth_getBlockTransactionCountByNumber',
	'eth_getCode',
	'eth_getLogs',
	'eth_getStorageAt',
	'eth_getTransactionByBlockHashAndIndex',
	'eth_getTransactionByBlockNumberAndIndex',
	'eth_getTransactionByHash',
	'eth_getTransactionCount',
	'eth_getTransactionReceipt',
	'eth_getUncleByBlockHashAndIndex',
	'eth_getUncleByBlockNumberAndIndex',
	'eth_getUncleCountByBlockHash',
	'eth_getUncleCountByBlockNumber',
	'eth_getWork',
	'eth_mining',
	'eth_hashrate',
	'eth_protocolVersion',
	'eth_sendTransaction',
	'eth_sendRawTransaction',
	'eth_sign',
	'eth_submitWork',
	'eth_syncing',
	'net_listening',
	'net_peerCount',
	'net_version',
	'parity_nextNonce',
	'web3_clientVersion',
	'eth_newFilter',
	'eth_newBlockFilter',
	'eth_newPendingTransactionFilter',
	'eth_getFilterLogs',
	'eth_getFilterChanges',
	'eth_uninstallFilter',
	'eth_subscribe',
	'eth_unsubscribe',

	'debug_traceTransaction',
	'debug_traceCall',

	'evm_mine'
]