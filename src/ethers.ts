'use strict';

import { TransactionResponse, JsonRpcProvider, TransactionReceipt, Provider } from '@ethersproject/providers';
import { poll } from '@ethersproject/web';
import {
	BigNumber,
	ContractFactory,
	Contract,
	ContractReceipt,
	ContractInterface,
	Signer,
	Event
} from 'ethers';
import { Formatter } from '@ethersproject/providers';
import {
	isHexString,
	ParamType,
	getAddress,
	getStatic,
	defineReadOnly,
	deepCopy,
	LogDescription,
	BytesLike
} from 'ethers/lib/utils'
import { Logger } from "@ethersproject/logger";
const logger = new Logger('web3-providers-connex/ethers');

export const modifyProvider = (provider: JsonRpcProvider) => {
	provider.getTransaction = async (transactionHash: string | Promise<string>) => {
		await provider.getNetwork();
		transactionHash = await transactionHash;

		const params = { transactionHash: provider.formatter.hash(transactionHash, true) };

		return <Promise<TransactionResponse>>poll(async () => {
			// const result = await provider.perform("getTransaction", params);
			const result = await provider.send('eth_getTransactionByHash', [transactionHash]);

			if (result == null) {
				if (provider._emitted["t:" + transactionHash] == null) {
					return null;
				}
				return undefined;
			}

			// const tx = provider.formatter.transactionResponse(result);
			if (result.to == null && result.creates == null) {
				// transaction.creates = this.contractAddress(transaction);
				const receipt: TransactionReceipt = await provider.send('eth_getTransactionReceipt', [transactionHash]);
				result.creates = receipt.contractAddress;
			}
			const tx = transactionResponse(provider, result);

			if (tx.blockNumber == null) {
				tx.confirmations = 0;

			} else if (tx.confirmations == null) {
				const blockNumber = await provider._getInternalBlockNumber(100 + 2 * provider.pollingInterval);

				// Add the confirmations using the fast block number (pessimistic)
				let confirmations = (blockNumber - tx.blockNumber) + 1;
				if (confirmations <= 0) { confirmations = 1; }
				tx.confirmations = confirmations;
			}

			return provider._wrapTransaction(tx);
		}, { oncePoll: this });
	}

	const transactionResponse = (provider: JsonRpcProvider, transaction: any): TransactionResponse => {

		// Rename gas to gasLimit
		if (transaction.gas != null && transaction.gasLimit == null) {
			transaction.gasLimit = transaction.gas;
		}

		// Some clients (TestRPC) do strange things like return 0x0 for the
		// 0 address; correct this to be a real address
		if (transaction.to && BigNumber.from(transaction.to).isZero()) {
			transaction.to = "0x0000000000000000000000000000000000000000";
		}

		// Rename input to data
		if (transaction.input != null && transaction.data == null) {
			transaction.data = transaction.input;
		}

		// // If to and creates are empty, populate the creates from the transaction
		// if (transaction.to == null && transaction.creates == null) {
		// 	transaction.creates = this.contractAddress(transaction);
		// }

		if ((transaction.type === 1 || transaction.type === 2) && transaction.accessList == null) {
			transaction.accessList = [];
		}

		const result: TransactionResponse = Formatter.check(provider.formatter.formats.transaction, transaction);

		if (transaction.chainId != null) {
			let chainId = transaction.chainId;

			if (isHexString(chainId)) {
				chainId = BigNumber.from(chainId).toNumber();
			}

			result.chainId = chainId;

		} else {
			let chainId = transaction.networkId;

			// geth-etc returns chainId
			if (chainId == null && result.v == null) {
				chainId = transaction.chainId;
			}

			if (isHexString(chainId)) {
				chainId = BigNumber.from(chainId).toNumber();
			}

			if (typeof (chainId) !== "number" && result.v != null) {
				chainId = (result.v - 35) / 2;
				if (chainId < 0) { chainId = 0; }
				chainId = parseInt(chainId);
			}

			if (typeof (chainId) !== "number") { chainId = 0; }

			result.chainId = chainId;
		}

		// // 0x0000... should actually be null
		// if (result.blockHash && result.blockHash.replace(/0/g, "") === "x") {
		// 	result.blockHash = null;
		// }

		return result;
	}

	return provider;
}

export const modifyFactory = (factory: ContractFactory) => {
	factory.deploy = async (...args: Array<any>): Promise<Contract> => {
		let overrides: any = {};

		// If 1 extra parameter was passed in, it contains overrides
		if (args.length === factory.interface.deploy.inputs.length + 1) {
			overrides = args.pop();
		}

		// Make sure the call matches the constructor signature
		logger.checkArgumentCount(args.length, factory.interface.deploy.inputs.length, " in Contract constructor");

		// Resolve ENS names and promises in the arguments
		const params = await resolveAddresses(factory.signer, args, factory.interface.deploy.inputs);
		params.push(overrides);

		// Get the deployment transaction (with optional overrides)
		const unsignedTx = factory.getDeployTransaction(...params);

		// Send the deployment transaction
		const tx = await factory.signer.sendTransaction(unsignedTx);

		// const address = getStatic<(tx: TransactionResponse) => string>(this.constructor, "getContractAddress")(tx);
		const address = (<any>tx).creates;
		const contract = getStatic<
			(address: string, contractInterface: ContractInterface, signer?: Signer) => Contract
		>(factory.constructor, "getContract")(address, factory.interface, factory.signer);

		// Add the modified wait that wraps events
		addContractWait(contract, tx);

		defineReadOnly(contract, "deployTransaction", tx);
		return contract;
	}

	const resolveAddresses = async (
		resolver: Signer | Provider,
		value: any, paramType: ParamType | Array<ParamType>
	): Promise<any> => {
		if (Array.isArray(paramType)) {
			return await Promise.all(paramType.map((paramType, index) => {
				return resolveAddresses(
					resolver,
					((Array.isArray(value)) ? value[index] : value[paramType.name]),
					paramType
				);
			}));
		}

		if (paramType.type === "address") {
			return await resolveName(resolver, value);
		}

		if (paramType.type === "tuple") {
			return await resolveAddresses(resolver, value, paramType.components);
		}

		if (paramType.baseType === "array") {
			if (!Array.isArray(value)) {
				return Promise.reject(logger.makeError("invalid value for array", Logger.errors.INVALID_ARGUMENT, {
					argument: "value",
					value
				}));
			}
			return await Promise.all(value.map((v) => resolveAddresses(resolver, v, paramType.arrayChildren)));
		}

		return value;
	}

	const resolveName = async (
		resolver: Signer | Provider,
		nameOrPromise: string | Promise<string>
	): Promise<string> => {
		const name = await nameOrPromise;

		if (typeof (name) !== "string") {
			logger.throwArgumentError("invalid address or ENS name", "name", name);
		}

		// If it is already an address, just use it (after adding checksum)
		try {
			return getAddress(name);
		} catch (error) { }

		if (!resolver) {
			logger.throwError("a provider or signer is needed to resolve ENS names", Logger.errors.UNSUPPORTED_OPERATION, {
				operation: "resolveName"
			});
		}

		const address = await resolver.resolveName(name);

		if (address == null) {
			logger.throwArgumentError("resolver or addr is not configured for ENS name", "name", name);
		}

		return <string>address;
	}

	const addContractWait = (contract: Contract, tx: TransactionResponse) => {
		const wait = tx.wait.bind(tx);
		tx.wait = (confirmations?: number) => {
			return wait(confirmations).then((receipt: ContractReceipt) => {
				receipt.events = receipt.logs.map((log) => {
					let event: Event = (<Event>deepCopy(log));
					let parsed: LogDescription | null = null;
					try {
						parsed = contract.interface.parseLog(log);
					} catch (e) { }

					// Successfully parsed the event log; include it
					if (parsed) {
						event.args = parsed.args;
						event.decode = (data: BytesLike, topics?: Array<any>) => {
							if (!!parsed) {
								return contract.interface.decodeEventLog(parsed.eventFragment, data, topics);
							}
						};
						event.event = parsed.name;
						event.eventSignature = parsed.signature;
					}

					// Useful operations
					event.removeListener = () => { return contract.provider; }
					event.getBlock = () => {
						return contract.provider.getBlock(receipt.blockHash);
					}
					event.getTransaction = () => {
						return contract.provider.getTransaction(receipt.transactionHash);
					}
					event.getTransactionReceipt = () => {
						return Promise.resolve(receipt);
					}

					return event;
				});

				return receipt;
			});
		};
	}

	return factory;
}

// const MAX_POLL_NUM = 5;
// export const modifySigner = (signer: JsonRpcSigner) => {
// 	signer.sendTransaction = async (transaction: Deferrable<TransactionRequest>) => {
// 		// This cannot be mined any earlier than any recent block
// 		const blockNumber = await signer.provider._getInternalBlockNumber(100 + 2 * signer.provider.pollingInterval);

// 		// Send the transaction
// 		const hash = await signer.sendUncheckedTransaction(transaction);

// 		// await signer.provider.send('thor_next', []);

// 		try {
// 			// Unfortunately, JSON-RPC only provides and opaque transaction hash
// 			// for a response, and we need the actual transaction, so we poll
// 			// for it; it should show up very quickly
// 			// const pollRes = await poll(async () => {
// 			// 	const tx = await signer.provider.getTransaction(hash);
// 			// 	if (tx === null) { return undefined; }
// 			// 	return signer.provider._wrapTransaction(tx, hash, blockNumber);
// 			// }, { oncePoll: signer.provider });
// 			// if (pollRes === undefined) { throw new Error('unexpected error'); }
// 			// return pollRes;

// 			let poll = 0;
// 			for (; ;) {
// 				if (poll > MAX_POLL_NUM) { throw new Error('timeout'); }

// 				const tx = await getTransaction(signer.provider, hash);
// 				if (tx == null) {
// 					await signer.provider.send('thor_next', []);
// 					poll++;
// 					continue;
// 				}

// 				return signer.provider._wrapTransaction(tx, hash, blockNumber);
// 			}
// 		} catch (error: any) {
// 			error.transactionHash = hash;
// 			throw error;
// 		}
// 	}

// 	return signer;
// }

