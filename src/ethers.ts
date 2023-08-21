'use strict';

import {
	BaseContract,
	ContractFactory,
	BrowserProvider,
	ContractMethodArgs,
	ContractTransactionResponse,
	assert,
	TransactionResponseParams,
	getBigInt,
	getNumber,
	accessListify,
	getAddress,
	Network,
	TransactionResponse
} from "ethers";

import { 
	formatHash,
	object,
	allowNull,
	formatData,
} from "../node_modules/ethers/lib.commonjs/providers/format";

export const modifyFactory = (factory: ContractFactory<Array<any>, BaseContract>) => {
	factory.deploy = async function (...args: ContractMethodArgs<Array<any>>): Promise<BaseContract & { deploymentTransaction(): ContractTransactionResponse } & Omit<BaseContract, keyof BaseContract>> {
		const tx = await this.getDeployTransaction(...args);

		assert(this.runner && typeof (this.runner.sendTransaction) === "function",
			"factory runner does not support sending transactions", "UNSUPPORTED_OPERATION", {
			operation: "sendTransaction"
		});

		const sentTx = await this.runner.sendTransaction(tx);

		// Patch the original code (Line 112 in contract/factory.ts): 
		//
		//    const address = getCreateAddress(sentTx);
		//
		let address: string | null = null;
		let count = 0; // try 5 times
		while (count < 5) {
			if (!this.runner.provider) {
				throw new Error("no provider");
			}
			const receipt = await this.runner.provider.getTransactionReceipt(sentTx.hash);
			if (receipt) {
				address = receipt.contractAddress;
				break;
			}
			count++;
		}
		// End of the patch

		return new (<any>BaseContract)(address, this.interface, this.runner, sentTx);
	};

	return factory;
}

export const modifyProvider = (provider: BrowserProvider) => {
	provider._wrapTransactionResponse = function (tx: TransactionResponseParams, network: Network): TransactionResponse {
		return new TransactionResponse(formatTransactionResponse(tx), this);
	}

	return provider
}

function formatTransactionResponse(value: any): TransactionResponseParams {
	const BN_0 = BigInt(0);

    // Some clients (TestRPC) do strange things like return 0x0 for the
    // 0 address; correct this to be a real address
    if (value.to && getBigInt(value.to) === BN_0) {
        value.to = "0x0000000000000000000000000000000000000000";
    }

    const result = object({
        hash: formatHash,

        type: (value: any) => {
            if (value === "0x" || value == null) { return 0; }
            return getNumber(value);
        },
        accessList: allowNull(accessListify, null),

        blockHash: allowNull(formatHash, null),
        blockNumber: allowNull(getNumber, null),
        transactionIndex: allowNull(getNumber, null),

        //confirmations: allowNull(getNumber, null),

        from: getAddress,

        // either (gasPrice) or (maxPriorityFeePerGas + maxFeePerGas) must be set
        gasPrice: allowNull(getBigInt),
        maxPriorityFeePerGas: allowNull(getBigInt),
        maxFeePerGas: allowNull(getBigInt),

        gasLimit: getBigInt,
        to: allowNull(getAddress, null),
        value: getBigInt,
        nonce: getNumber,
        data: formatData,

        creates: allowNull(getAddress, null),

        chainId: allowNull(getBigInt, null)
    }, {
        data: [ "input" ],
        gasLimit: [ "gas" ]
    })(value);

	// Remove the original code (Line 227-229 in providers/format.ts) due to 
	// the incompactibility of fn getCreateAddress:
	//
	//    // If to and creates are empty, populate the creates from the value
    //    if (result.to == null && result.creates == null) {
    //        result.creates = getCreateAddress(result)
	//    }

    // @TODO: Check fee data

    // Add an access list to supported transaction types
    if ((value.type === 1 || value.type === 2) && value.accessList == null) {
        result.accessList = [ ];
    }

	// Remove the original code (Line 239-243 in providers/format.ts):
	//
	//    // Compute the signature
    //    if (value.signature) {
    //        result.signature = Signature.from(value.signature);
    //    } else {
    //        result.signature = Signature.from(value);
    //    }
    
	// Remove the original code (Line 246-249 in providers/format.ts):
	// 
	//    // Some backends omit ChainId on legacy transactions, but we can compute it
    //    if (result.chainId == null) {
    //        const chainId = result.signature.legacyChainId;
    //        if (chainId != null) { result.chainId = chainId; }
    //    }

    // 0x0000... should actually be null
    if (result.blockHash && getBigInt(result.blockHash) === BN_0) {
        result.blockHash = null;
    }

    return result;
}