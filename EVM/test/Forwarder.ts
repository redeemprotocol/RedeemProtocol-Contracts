import { ethers, waffle } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
const { provider } = waffle;
import { RPC20, RPC721 } from "../typechain-types/contracts/test";
import { RedeemProtocolFactory, RedeemProtocolRealm, RedeemSystemForwarder } from "../typechain-types";
import { defaultAbiCoder } from "@ethersproject/abi";
import { TypedDataDomain } from "ethers";

describe("RedeemSystemForwarder", function () {
    const zeroBytes32 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('')]);
    const setupFee = ethers.utils.parseEther("0.1");
    const udpateFee = ethers.utils.parseEther("0.2");
    const redeemFee = ethers.utils.parseEther("0.3");
    const realmRedeemFee = ethers.utils.parseEther("0.4");
    const redeemWithMarkABI = new ethers.utils.Interface([
        "function redeemWithMark(address _contractAddress, uint256 _tokenId, bytes32 _customId, uint _deadline, uint8 _v, bytes32 _r, bytes32 _s)"
    ]);
    const tokenId = 0;
    const customId = defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('mock-custom-id')]);
    const types = {
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
    const suffixData = '0x';

    let redeemProtocolOperator: SignerWithAddress;
    let redeemSystemOperator: SignerWithAddress;
    let feeTokenOwner: SignerWithAddress;
    let nftOwner: SignerWithAddress;
    let feeReceiver: SignerWithAddress;
    let admin: SignerWithAddress;
    let opeator: SignerWithAddress;
    let realmOperator: SignerWithAddress;
    let rootCreator: SignerWithAddress;
    let clientOperator: SignerWithAddress;
    let endUser: SignerWithAddress;
    let feeToken: RPC20;
    let forwarder: RedeemSystemForwarder;
    let requestTypeHash: string
    let nft: RPC721;
    let factory: RedeemProtocolFactory;
    let realm: RedeemProtocolRealm;
    let domain: TypedDataDomain;
    let domainHash: string;

    this.beforeAll(async () => {
        [
            redeemProtocolOperator,
            redeemSystemOperator,
            feeTokenOwner,
            nftOwner,
            feeReceiver,
            admin,
            opeator,
            realmOperator,
            rootCreator,
            clientOperator,
            endUser
        ] = await ethers.getSigners();
    });

    this.beforeEach(async () => {
        await deployContracts();
        await mintNFT();
        await setUpForwarder();
    });

    async function deployContracts() {
        feeToken = (await deployFeeToken(feeTokenOwner)).feeToken;
        forwarder = (await depolyForwarder(redeemSystemOperator)).forwarder;
        requestTypeHash = (await forwarder.queryFilter(forwarder.filters.RequestTypeRegistered()))[0].args[0];
        nft = (await deployNFT(nftOwner)).nft;
        await feeToken.connect(feeTokenOwner).mint(realmOperator.address, ethers.utils.parseEther("1"));
        await feeToken.connect(feeTokenOwner).mint(clientOperator.address, ethers.utils.parseEther("1"));
        await feeToken.connect(feeTokenOwner).mint(nftOwner.address, ethers.utils.parseEther("1"));
        factory = (await deployRedeemProtocolFactory(
            feeToken,
            redeemProtocolOperator,
            feeReceiver,
            admin,
            opeator,
            realmOperator,
            rootCreator
        )).redeemProtocolFactory;
        await feeToken.connect(realmOperator).approve(factory.address, ethers.utils.parseEther("1"));
        const realmAddress = (await deployRealm(
            realmOperator,
            factory,
            forwarder
        )).realmAddress;
        realm = await ethers.getContractAt("RedeemProtocolRealm", realmAddress);
        await feeToken.connect(clientOperator).approve(forwarder.address, ethers.utils.parseEther("1"));
    }

    async function mintNFT() {
        const mintTransaction = await nft.connect(nftOwner).safeMint(endUser.address);
        await mintTransaction.wait();
    }

    async function setUpForwarder() {
        const regitsterDomain = await forwarder.connect(redeemSystemOperator).registerDomainSeparator(
            "RedeemSystemForwarder",
            "1.0.0"
        );
        const registerDomainReceipt = await regitsterDomain.wait();
        const domainSeparatorEvent = registerDomainReceipt.events?.filter((x) => { return x.event == "DomainRegistered" })[0];
        domainHash = domainSeparatorEvent?.args?.domainSeparator;
        domain = {
            name: "RedeemSystemForwarder",
            version: "1.0.0",
            chainId: provider.network.chainId,
            verifyingContract: forwarder.address
        };
    }

    async function deployFeeToken(owner: SignerWithAddress) {
        const Factory = await ethers.getContractFactory("RPC20");
        const feeToken = await Factory.connect(owner).deploy();
        await feeToken.deployed();

        return { feeToken, owner };
    }

    async function depolyForwarder(owner: SignerWithAddress) {
        const Factory = await ethers.getContractFactory("RedeemSystemForwarder");
        const forwarder = await Factory.connect(owner).deploy();
        await forwarder.deployed();

        return { forwarder, owner };
    }

    async function deployNFT(owner: SignerWithAddress) {
        const Factory = await ethers.getContractFactory("RPC721");
        const nft = await Factory.connect(owner).deploy();
        await nft.deployed();

        return { nft, owner };
    }

    async function deployRealm(owner: SignerWithAddress, factory: RedeemProtocolFactory, forwarder: RedeemSystemForwarder) {
        const transaction = await factory.connect(owner).createRealm(
            0,
            realmRedeemFee,
            ethers.constants.AddressZero,
            forwarder.address,
            0,
            0,
            zeroBytes32,
            zeroBytes32
        );
        const receipt = await transaction.wait();
        const realmCreatedEvent = receipt.events?.filter((x) => { return x.event == "RealmCreated" })[0];
        const realmAddress: string = realmCreatedEvent?.args?.realm;
        return { realmAddress };
    }

    async function deployRedeemProtocolFactory(
        feeToken: RPC20,
        owner: SignerWithAddress,
        feeReceiver: SignerWithAddress,
        admin: SignerWithAddress,
        operator: SignerWithAddress,
        realmOperator: SignerWithAddress,
        rootCreator: SignerWithAddress
    ) {
        const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
        const redeemProtocolFactory = await Factory.connect(owner).deploy(
            {
                amount: setupFee,
                token: feeToken.address,
            },
            {
                amount: udpateFee,
                token: feeToken.address,
            },
            {
                amount: redeemFee,
                token: feeToken.address,
            },
            feeReceiver.address
        );
        await redeemProtocolFactory.grantRole((await redeemProtocolFactory.ADMIN()), operator.address);
        await redeemProtocolFactory.grantRole((await redeemProtocolFactory.REALM_CREATOR()), realmOperator.address);
        await redeemProtocolFactory.grantRole((await redeemProtocolFactory.ROOT_CREATOR()), rootCreator.address);

        return {
            redeemProtocolFactory,
            owner,
            admin,
            operator,
            realmOperator,
            rootCreator
        };
    }

    it("Forwarder domainSeperator should be registered.", async () => {
        expect(await forwarder.domains(domainHash)).to.be.true;
    });

    it("Forwarder requestTypeHash should be registered.", async () => {
        expect(await forwarder.typeHashes(requestTypeHash)).to.be.true;
    })

    it("FeeReceiver should receive the setup fee after Realm has been deployed.", async () => {
        expect(await feeToken.balanceOf(feeReceiver.address)).to.equal(setupFee);
    });

    it("Redeem with mark via Forwarder", async () => {
        const data = redeemWithMarkABI.encodeFunctionData("redeemWithMark", [
            nft.address,
            tokenId,
            customId,
            0,
            0,
            zeroBytes32,
            zeroBytes32
        ]);
        const message = {
            from: endUser.address,
            to: realm.address,
            nonce: Number(await forwarder.connect(clientOperator).getNonce(clientOperator.address)),
            gas: 210000,
            value: 0,
            data: data,
            validUntilTime: Date.now() + 30000
        };
        const signature = await endUser._signTypedData(
            domain,
            types,
            message
        );
        const transaction = await forwarder.connect(clientOperator).execute(
            message,
            domainHash,
            requestTypeHash,
            suffixData,
            signature
        );
        await transaction.wait();
        const isRedeemable = await realm.isRedeemable(nft.address, tokenId, customId);
        expect(isRedeemable).to.be.false;
        expect(await feeToken.balanceOf(realm.address)).to.equal(realmRedeemFee.sub(redeemFee));
        expect(await feeToken.balanceOf(forwarder.address)).to.equal(0);
        expect(await feeToken.balanceOf(feeReceiver.address)).to.equal(redeemFee.add(setupFee));
    });
})