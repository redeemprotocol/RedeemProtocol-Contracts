import { task, types } from "hardhat/config";
import { defaultAbiCoder } from "@ethersproject/abi";
import dotenv from 'dotenv';

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

task("deployFeeToken", "Deploy fee token").setAction(
    async (_args, { ethers, run }) => {
        await run("compile");
        try {
            const [redeemProtocolOperator] = await ethers.getSigners();
            const ERC20Factory = await ethers.getContractFactory("RPC20");
            const feeToken = await ERC20Factory.connect(redeemProtocolOperator).deploy();
            await feeToken.deployed();
            console.log("FeeToken deployed:", feeToken.address);
            return feeToken.address;
        } catch (message) {
            console.error(message);
        }
    }
)

task("deployNFT", "Deploy NFT").setAction(
    async (_args, { ethers, run }) => {
        await run("compile");
        try {
            const [redeemProtocolOperator] = await ethers.getSigners();
            const ERC721Factory = await ethers.getContractFactory("RPC721");
            const nft = await ERC721Factory.connect(redeemProtocolOperator).deploy();
            await nft.deployed();
            console.log("NFT deployed:", nft.address);
            return nft.address;
        } catch (message) {
            console.error(message);
        }
    }
);

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
    .addParam("setupFee", "Set up fee amount", "1", types.string)
    .addParam("updateFee", "Update fee amount", "1", types.string)
    .addParam("redeemFee", "Update fee amount", "1", types.string)
    .addParam("feeTokenAddress", "Fee token address", undefined, types.string)
    .addParam("feeReceiverAddress", "Fee receiver address", undefined, types.string)
    .setAction(
        async ({
            setupFee, updateFee, redeemFee, feeTokenAddress, feeReceiverAddress
        }: {
            setupFee: string, updateFee: string, redeemFee: string, feeTokenAddress: string, feeReceiverAddress: string
        }, { ethers, run }) => {
            await run("compile");
            try {
                const [redeemProtocolOperator] = await ethers.getSigners();
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
                return redeemProtocolFactory.address
            } catch (message) {
                console.error(message);
            }
        }
    );

task("grantRoles", "Grant roles for RedeemSystemOperator")
    .addParam("factoryAddress", "RedeemProtocolFactory address", undefined, types.string)
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

task("approveTokenFee", "Approve token spender")
    .addParam("tokenAddress", "Token address", undefined, types.string)
    .addParam("factory", "Factory address", undefined, types.string)
    .addParam("forwarder", "Factory address", undefined, types.string)
    .addParam("amount", "Amount", undefined, types.string)
    .setAction(
        async ({
            tokenAddress, factory, forwarder, amount
        }: {
            tokenAddress: string, factory: string, forwarder: string, amount: string
        }, { ethers, run }) => {
            await run("compile");
            try {
                const [_, redeemSystemOperator, clientOperator] = await ethers.getSigners();
                const feeToken = await ethers.getContractAt("RPC20", tokenAddress);
                await feeToken.connect(redeemSystemOperator).approve(factory, ethers.utils.parseEther(amount));
                await feeToken.connect(clientOperator).approve(forwarder, ethers.utils.parseEther(amount));
                console.log('Approve token fee successfully.');
            } catch (message) {
                console.error(message);
            }
        }
    )

task("createRealm", "Create realm")
    .addParam("factoryAddress", "RedeemProtocolFactory address", undefined, types.string)
    .addParam("redeemMethod", "RedeemMethod: 0 - mark/ 1 - transfer/ 2 - burn", undefined, types.int)
    .addParam("redeemAmount", "Redeem amount", undefined, types.string)
    .addParam("tokenReceiver", "Redeem with transfer to that address", undefined, types.string, true)
    .addParam("forwarder", "Forwarder address", undefined, types.string)
    .setAction(
        async ({
            factoryAddress, redeemMethod, redeemAmount, tokenReceiver, forwarder
        }: {
            factoryAddress: string, redeemMethod: number, redeemAmount: string, tokenReceiver: string, forwarder: string
        }, { ethers, run }) => {
            await run("compile");
            const zeroBytes32 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('')]);
            try {
                const [_, redeemSystemOperator] = await ethers.getSigners();
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
                console.log(`Realm deployed: ${realmAddress}`);
                return { realmAddress };
            } catch (message) {
                console.error(message);
            }
        }
    );

task("accounts", "List all of accounts")
    .setAction(async (_args, { ethers, run }) => {
        const [redeemProtocolOperator, redeemSystemOperator, clientOperator] = await ethers.getSigners();
        await Promise.all(
            [
                run("balanceOf", { address: redeemProtocolOperator.address }).then((balance) => {
                    console.log(`RedeemProtocolOperator:${redeemProtocolOperator.address} - $${ethers.utils.formatUnits(balance)}`);
                }),
                run("balanceOf", { address: redeemSystemOperator.address }).then((balance) => {
                    console.log(`RedeemSystemOperator:${redeemSystemOperator.address} - $${ethers.utils.formatUnits(balance)}`);
                }),
                run("balanceOf", { address: clientOperator.address }).then((balance) => {
                    console.log(`Client EOA:${clientOperator.address} - $${ethers.utils.formatUnits(balance)}`);
                })
            ]
        );
    });

task("balanceOf", "Get balance of account")
    .addParam("address", "Address", undefined, types.string)
    .setAction(async ({
        address
    }: {
        address: string
    }, { ethers, run }) => {
        const balance = await ethers.provider.getBalance(address);
        return balance;
    });

task("mintFeeToken", "Mint fee token to address")
    .addParam("contractAddress", "Token addresss", undefined, types.string)
    .addParam("receiver", "Receiver address", undefined, types.string)
    .setAction(async ({
        contractAddress, receiver
    }: {
        contractAddress: string, receiver: string
    }, { ethers, run }) => {
        const [redeemProtocolOperator] = await ethers.getSigners();
        try {
            const feeToken = await ethers.getContractAt("RPC20", contractAddress);
            await feeToken.connect(redeemProtocolOperator).mint(receiver, ethers.utils.parseEther("100"));
            console.log(`Send $100 RPC to: ${receiver}`);
        } catch (message) {
            console.error(message);
        }
    });

task("mintNFT", "Mint fee token to address")
    .addParam("contractAddress", "Token addresss", undefined, types.string)
    .addParam("receiver", "Receiver address", undefined, types.string)
    .setAction(async ({
        contractAddress, receiver
    }: {
        contractAddress: string, receiver: string
    }, { ethers, run }) => {
        const [redeemProtocolOperator] = await ethers.getSigners();
        try {
            const nft = await ethers.getContractAt("RPC721", contractAddress);
            await nft.connect(redeemProtocolOperator).safeMint(receiver);
            console.log(`Send an NFT to ${receiver}`);
        } catch (message) {
            console.error(message);
        }
    });

task("redeemWithMark", "Redeem with mark via Forwarder")
    .addParam("forwarderAddress", "Forwarder address", process.env.MUMBAI_REDEEM_SYSTEM_FORWARDER, types.string, true)
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
        const [redeemProtocolOperator, _, clientOperator] = await ethers.getSigners();
        const redeemWithMarkABI = new ethers.utils.Interface([
            "function redeemWithMark(address _contractAddress, uint256 _tokenId, bytes32 _customId, uint _deadline, uint8 _v, bytes32 _r, bytes32 _s)"
        ]);
        const zeroBytes32 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('')]);
        try {
            const forwarder = await ethers.getContractAt("PassportForwarder", forwarderAddress)
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
            const nonce = Number(await forwarder.connect(redeemProtocolOperator).getNonce(redeemProtocolOperator.address));
            const message = {
                from: redeemProtocolOperator.address,
                to: realmAddress,
                nonce: nonce,
                gas: 210000,
                value: 0,
                data: data,
                validUntilTime: Math.round(Date.now() / 1000 + 60)
            };
            const signature = await redeemProtocolOperator._signTypedData(
                domain,
                forwarderTypes,
                message
            );
            const transaction = await forwarder.connect(clientOperator).execute(
                message,
                domainHash,
                requestTypeHash,
                '0x',
                signature
            );
            const receipt = await transaction.wait();
            const redeemEvent = receipt.events?.filter((x) => { return x.event == "Redeemed" })[0];
            console.log("Redeem successfully:", receipt.transactionHash);
            console.log('redeemEvent:', redeemEvent);
            console.log("contract addres:", redeemEvent?.args?.contractAddress);
            console.log("token id:", redeemEvent?.args?.tokenId);
            console.log("redeem method:", redeemEvent?.args?.redeemMethod);
            console.log("redeemer:", redeemEvent?.args?.redeemer);
            console.log("custom id:", redeemEvent?.args?.customId);
            console.log("custom id value:", ethers.utils.parseBytes32String(redeemEvent?.args?.customId));
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