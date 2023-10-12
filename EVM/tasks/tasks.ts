import { task, types } from "hardhat/config";
import { defaultAbiCoder } from "@ethersproject/abi";
import dotenv from 'dotenv';
import { token } from "../typechain-types/@openzeppelin/contracts";

dotenv.config();

const domainName = "PassportForwarder";
const domainVersion = "1.0.0";
const forwarderTypes = {
    ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "validUntilTime", type: "uint256" }
    ]
};

task("deployForwarder", "Deploy Forwarder").setAction(
    async (_args, { ethers, run }) => {
        await run("compile");
        try {
            const [
                _,
                redeemSystemOperator
            ] = await ethers.getSigners();
            const Factory = await ethers.getContractFactory("PassportForwarder");
            const forwarder = await Factory.connect(redeemSystemOperator).deploy();
            await forwarder.deployed();
            const register = await forwarder.connect(redeemSystemOperator).registerDomainSeparator(domainName, domainVersion);
            const receipt = await register.wait();
            const domainSeparatorEvent = receipt.events?.filter((x) => { return x.event == "DomainRegistered" })[0];
            const domainHash = domainSeparatorEvent?.args?.domainSeparator;
            console.log("PassportForwarder deployed:", forwarder.address);
            console.log("domainHash:", domainHash);
            return forwarder.address;
        } catch (message) {
            console.error(message);
        }
    }
);

task("deployFactory", "Deploy Factory")
    .addParam("setupFee", "Set up fee amount", "1200", types.string)
    .addParam("updateFee", "Update fee amount", "120", types.string)
    .addParam("redeemFee", "redeem fee amount", "1", types.string)
    .addParam("feeTokenAddress", "Fee token address", process.env.MUMBAI_FEE_TOKEN, types.string)
    .addParam("feeReceiverAddress", "Fee receiver address", process.env.MUMBAI_FEE_RECEIVER, types.string)
    .setAction(
        async ({
            setupFee, updateFee, redeemFee, feeTokenAddress, feeReceiverAddress
        }: {
            setupFee: string, updateFee: string, redeemFee: string, feeTokenAddress: string, feeReceiverAddress: string
        }, { ethers, run }) => {
            await run("compile");
            try {
                const [redeemProtocolOperator, redeemSystemOpeator] = await ethers.getSigners();
                const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
                const redeemProtocolFactory = await Factory.connect(redeemProtocolOperator).deploy(
                    {
                        amount: ethers.utils.parseEther(setupFee),
                        token: feeTokenAddress,
                    },
                    {
                        amount: ethers.utils.parseEther(updateFee),
                        token: feeTokenAddress,
                    },
                    {
                        amount: ethers.utils.parseEther(redeemFee),
                        token: feeTokenAddress,
                    },
                    feeReceiverAddress
                );
                await redeemProtocolFactory.deployed();
                console.log("RedeemProtocolFactory deployed:", redeemProtocolFactory.address);
                await redeemProtocolFactory.setDesignateSetupFee(
                    redeemSystemOpeator.address,
                    ethers.utils.parseEther("0"),
                    feeTokenAddress
                );
                return redeemProtocolFactory.address
            } catch (message) {
                console.error(message);
            }
        }
    );

task("grantRoles", "Grant roles for RedeemSystemOperator")
    .addParam("factoryAddress", "RedeemProtocolFactory address", process.env.MUMBAI_FACTORY, types.string)
    .setAction(
        async ({
            factoryAddress
        }: {
            factoryAddress: string
        }, { ethers, run }) => {
            await run("compile");
            try {
                const [redeemProtocolOperator, redeemSystemOperator] = await ethers.getSigners();
                const redeemProtocolFactory = await ethers.getContractAt("RedeemProtocolFactory", factoryAddress);
                const admin = await redeemProtocolFactory.ADMIN();
                const realmCreator = await redeemProtocolFactory.REALM_CREATOR();
                const rootCreator = await redeemProtocolFactory.ROOT_CREATOR();
                await redeemProtocolFactory.connect(redeemProtocolOperator).grantRole(admin, redeemProtocolOperator.address);
                await redeemProtocolFactory.connect(redeemProtocolOperator).grantRole(realmCreator, redeemSystemOperator.address);
                await redeemProtocolFactory.connect(redeemProtocolOperator).grantRole(rootCreator, redeemProtocolOperator.address);
                console.log('Grant role successfully.');
            } catch (message) {
                console.error(message);
            }
        }
    );

task("approveFeeToken", "Approve token spender")
    .addParam("tokenAddress", "Token address", process.env.MUMBAI_FEE_TOKEN, types.string)
    .addParam("factory", "Factory address", process.env.MUMBAI_FACTORY, types.string)
    .addParam("forwarder", "Factory address", process.env.MUMBAI_FORWARDER, types.string)
    .addParam("amount", "Amount", '10000', types.string)
    .setAction(
        async ({
            tokenAddress, factory, forwarder, amount
        }: {
            tokenAddress: string, factory: string, forwarder: string, amount: string
        }, { ethers, run }) => {
            await run("compile");
            try {
                const [_, redeemSystemOperator, clientOperator, eoa, operator] = await ethers.getSigners();
                const feeToken = await ethers.getContractAt("RPC20", tokenAddress);
                await feeToken.connect(redeemSystemOperator).approve(factory, ethers.utils.parseEther(amount));
                await feeToken.connect(clientOperator).approve(forwarder, ethers.utils.parseEther(amount));
                await feeToken.connect(operator).approve(forwarder, ethers.utils.parseEther(amount));
                console.log('Approve token fee successfully.');
            } catch (message) {
                console.error(message);
            }
        }
    )

task("approveOperator", "Approve token spender")
    .addParam("tokenAddress", "Token address", process.env.MUMBAI_FEE_TOKEN, types.string)
    .addParam("realmAddress", "Factory address", process.env.MUMBAI_REALM, types.string)
    .addParam("forwarderAddress", "Factory address", process.env.MUMBAI_FORWARDER, types.string)
    .addParam("amount", "Amount", '10000', types.string)
    .setAction(
        async ({
            tokenAddress, realmAddress, amount
        }: {
            tokenAddress: string, realmAddress: string, amount: string
        }, { ethers, run }) => {
            await run("compile");
            try {
                const [_, redeemSystemOperator, clientOperator, eoa, operator] = await ethers.getSigners();
                const feeToken = await ethers.getContractAt("RPC20", tokenAddress);
                await feeToken.connect(operator).approve(realmAddress, ethers.utils.parseEther(amount));
                console.log('Approve token fee successfully.');
            } catch (message) {
                console.error(message);
            }
        }
    )

task("updateRealm", "Update realm")
    .addParam("realmAddress", "Realm address", undefined, types.string)
    .addParam("factoryAddress", "RedeemProtocolFactory address", process.env.MUMBAI_FACTORY, types.string)
    .addParam("feeTokenAddress", "Fee token address", process.env.MUMBAI_FEE_TOKEN, types.string)
    .setAction(
        async ({
            realmAddress, factoryAddress, feeTokenAddress
        }: {
            realmAddress: string, factoryAddress: string, feeTokenAddress: string
        }, { ethers, run }) => {
            // 0x9cfb81D624D7bC6e4890dC018Cb30e9953e68692
            await run("compile");
            try {
                const [redeemProtocolOperator, redeemSystemOperator, clientOperator, eoa, operator] = await ethers.getSigners();
                const redeemProtocolFactory = await ethers.getContractAt("RedeemProtocolFactory", factoryAddress);
                const transaction = await redeemProtocolFactory.connect(redeemProtocolOperator).setBaseRedeemFee(
                    realmAddress,
                    0,
                    feeTokenAddress
                );
                const receipt = await transaction.wait();
                console.log(`Realm updated: ${realmAddress}`);
                return { realmAddress };
            } catch (message) {
                console.error(message);
            }
        }
    )

task("createRealm", "Create realm")
    .addParam("factoryAddress", "RedeemProtocolFactory address", process.env.MUMBAI_FACTORY, types.string)
    .addParam("redeemMethod", "RedeemMethod: 0 - mark/ 1 - transfer/ 2 - burn", 0, types.int)
    .addParam("redeemAmount", "Redeem amount", '1', types.string)
    .addParam("tokenReceiver", "Redeem with transfer to that address", undefined, types.string, true)
    .addParam("forwarder", "Forwarder address", process.env.MUMBAI_FORWARDER, types.string)
    .setAction(
        async ({
            factoryAddress, redeemMethod, redeemAmount, tokenReceiver, forwarder
        }: {
            factoryAddress: string, redeemMethod: number, redeemAmount: string, tokenReceiver: string, forwarder: string
        }, { ethers, run }) => {
            await run("compile");
            const zeroBytes32 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('')]);
            try {
                const [_, redeemSystemOperator, clientOperator, eoa, operator] = await ethers.getSigners();
                const redeemProtocolFactory = await ethers.getContractAt("RedeemProtocolFactory", factoryAddress);
                const transaction = await redeemProtocolFactory.connect(redeemSystemOperator).createRealm(
                    redeemMethod,
                    ethers.utils.parseEther(redeemAmount),
                    tokenReceiver ?? ethers.constants.AddressZero,
                    forwarder,
                    0,
                    0,
                    zeroBytes32,
                    zeroBytes32
                );
                const receipt = await transaction.wait();
                const realmCreatedEvent = receipt.events?.filter((x) => { return x.event == "RealmCreated" })[0];
                const realmAddress: string = realmCreatedEvent?.args?.realm;
                const redeemProtocolRealm = await ethers.getContractAt("RedeemProtocolRealm", realmAddress);
                const operatorRole = await redeemProtocolRealm.OPERATOR();
                await redeemProtocolRealm.connect(redeemSystemOperator).grantRole(operatorRole, redeemSystemOperator.address);
                await redeemProtocolRealm.connect(redeemSystemOperator).grantRole(operatorRole, operator.address);
                console.log(`Realm deployed: ${realmAddress}`);
                return { realmAddress };
            } catch (message) {
                console.error(message);
            }
        }
    );

task("mint6672", "Mint 6672 to address")
    .addParam("contractAddress", "Token addresss", undefined, types.string)
    .addParam("receiver", "Receiver address", undefined, types.string)
    .setAction(async ({
        contractAddress, receiver
    }: {
        contractAddress: string, receiver: string
    }, { ethers, run }) => {
        const [redeemProtocolOperator] = await ethers.getSigners();
        try {
            const nft = await ethers.getContractAt("RPC6672", contractAddress);
            await nft.connect(redeemProtocolOperator).safeMint(receiver);
            console.log(`Send an NFT to ${receiver}`);
        } catch (message) {
            console.error(message);
        }
    });

task("redeemWithMark", "Redeem with mark via Forwarder")
    .addParam("forwarderAddress", "Forwarder address", process.env.MUMBAI_FORWARDER, types.string, true)
    .addParam("realmAddress", "Realm address", process.env.MUMBAI_REALM, types.string, true)
    .addParam("contractAddress", "NFT contract address", process.env.MUMBAI_NFT, types.string, true)
    .addParam("tokenId", "Token id", 0, types.int, true)
    .addParam("customId", "Custom Id", undefined, types.string)
    .addParam("domainHash", "Domain hash", process.env.MUMBAI_DOMAIN_HASH, types.string, true)
    .addParam("requestTypeHash", "Request type hash", process.env.REQUEST_TYPE_HASH, types.string, true)
    .setAction(async ({
        forwarderAddress, realmAddress, contractAddress, tokenId, customId, domainHash, requestTypeHash
    }: {
        forwarderAddress: string,
        realmAddress: string,
        contractAddress: string,
        tokenId: number,
        customId: string,
        domainHash: string,
        requestTypeHash: string
    }, { ethers, run }) => {
        const [redeemProtocol, redeemSystem, clientOperator, eoa, operator] = await ethers.getSigners();
        const redeemWithMarkABI = new ethers.utils.Interface([
            "function redeemWithMark(address _contractAddress, uint256 _tokenId, bytes32 _customId, uint _deadline, uint8 _v, bytes32 _r, bytes32 _s)"
        ]);
        const zeroBytes32 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('')]);
        try {
            const forwarder = await ethers.getContractAt("PassportForwarder", forwarderAddress);
            const domain = {
                name: domainName,
                version: domainVersion,
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: forwarderAddress
            };
            const data = redeemWithMarkABI.encodeFunctionData("redeemWithMark", [
                contractAddress,
                tokenId,
                defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String(customId)]),
                0,
                0,
                zeroBytes32,
                zeroBytes32
            ]);
            const realm = await ethers.getContractAt("RedeemProtocolRealm", realmAddress);
            const nonce = Number(await forwarder.connect(clientOperator).getNonce(clientOperator.address));
            const gas = await realm.connect(operator).estimateGas.redeemWithMark(
                contractAddress,
                tokenId,
                defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String(customId)]),
                0,
                0,
                zeroBytes32,
                zeroBytes32
            );
            console.log('gas estimate:', gas);
            const message = {
                from: clientOperator.address,
                to: realmAddress,
                nonce: nonce,
                gas: gas,
                value: 0,
                data: data,
                validUntilTime: Math.round(Date.now() / 1000 + 60)
            };
            const signature = await clientOperator._signTypedData(
                domain,
                forwarderTypes,
                message
            );
            const transaction = await forwarder.connect(eoa).execute(
                message,
                domainHash,
                requestTypeHash,
                '0x',
                signature
            );
            const receipt = await transaction.wait();
            console.log("Redeem successfully:", receipt.transactionHash);
        } catch (message) {
            console.error(message);
        }
    });

task("registerDomain", "Register domain separator")
    .addParam("forwarderAddress", "Forwarder address", undefined, types.string)
    .setAction(async ({
        forwarderAddress
    }: {
        forwarderAddress: string
    }, { ethers, run }) => {
        const [_, redeemSystemOperator] = await ethers.getSigners();
        try {
            const forwarder = await ethers.getContractAt("PassportForwarder", forwarderAddress);
            const register = await forwarder.connect(redeemSystemOperator).registerDomainSeparator(domainName, domainVersion);
            const receipt = await register.wait();
            const domainSeparatorEvent = receipt.events?.filter((x) => { return x.event == "DomainRegistered" })[0];
            const domainHash = domainSeparatorEvent?.args?.domainSeparator;
            console.log("domainHash:", domainHash);
        } catch (message) {
            console.error(message);
        }
    });

task("isRedeemable", "Check an NFT whether is redeemable or not")
    .addParam("realmAddress", "Realm address", process.env.MUMBAI_REALM, types.string, true)
    .addParam("tokenId", "Token id", 0, types.int, true)
    .addParam("contractAddress", "NFT contract address", process.env.MUMBAI_NFT, types.string, true)
    .addParam("customId", "Custom id", undefined, types.string)
    .setAction(async ({
        realmAddress, tokenId, contractAddress, customId
    }: {
        realmAddress: string, tokenId: number, contractAddress: string, customId: string
    }, { ethers, run }) => {
        try {
            const realm = await ethers.getContractAt("RedeemProtocolRealm", realmAddress);
            const isRedeemable = await realm.isRedeemable(
                contractAddress,
                tokenId,
                defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String(customId)])
            );
            console.log(`Contract: ${contractAddress}\nToken id: ${tokenId}\nCustom id: ${customId} is ${isRedeemable ? '' : 'not '}redeemable.`);
            return isRedeemable;
        } catch (message) {
            console.error(message);
        }
    });

task("isRedeemable2", "Check an NFT whether is redeemable or not")
    .addParam("realmAddress", "Realm address", process.env.MUMBAI_REALM, types.string, true)
    .addParam("tokenId", "Token id", 0, types.int, true)
    .addParam("contractAddress", "NFT contract address", process.env.MUMBAI_NFT, types.string, true)
    .addParam("customId", "Custom id", undefined, types.string)
    .setAction(async ({
        realmAddress, tokenId, contractAddress, customId
    }: {
        realmAddress: string, tokenId: number, contractAddress: string, customId: string
    }, { ethers, run }) => {
        try {
            const realm = await ethers.getContractAt("RedeemProtocolRealm", realmAddress);
            const isRedeemable = await realm.isRedeemable(
                contractAddress,
                tokenId,
                customId
            );
            console.log(`Contract: ${contractAddress}\nToken id: ${tokenId}\nCustom id: ${customId} is ${isRedeemable ? '' : 'not '}redeemable.`);
            return isRedeemable;
        } catch (message) {
            console.error(message);
        }
    });

task("editRedemption", "Redeem with mark via Forwarder")
    .addParam("realmAddress", "Realm address", process.env.MUMBAI_REALM, types.string, true)
    .addParam("contractAddress", "NFT contract address", process.env.MUMBAI_NFT, types.string, true)
    .addParam("tokenId", "Token id", 0, types.int, true)
    .addParam("redemptionId", "Custom Id", undefined, types.string)
    .addParam("isRedeemed", "is Redeemed", true, types.boolean)
    .setAction(async ({
        realmAddress, contractAddress, tokenId, redemptionId, isRedeemed
    }: {
        realmAddress: string,
        contractAddress: string,
        tokenId: number,
        redemptionId: string,
        isRedeemed: boolean
    }, { ethers, run }) => {
        const [redeemProtocolOperator, redeemSystemOperator, clientOperator] = await ethers.getSigners();
        try {
            const id = defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String(redemptionId)])
            const realm = await ethers.getContractAt("RedeemProtocolRealm", realmAddress);
            const transaction = await realm.connect(redeemSystemOperator).editRedemption(contractAddress, tokenId, id, isRedeemed);
            await transaction.wait();
            console.log(`Contract: ${contractAddress}\nToken id: ${tokenId}\nRedemption id: ${redemptionId} isRedeemed changes to ${isRedeemed}.`);
        } catch (message) {
            console.error(message);
        }
    });