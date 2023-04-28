import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { defaultAbiCoder } from "@ethersproject/abi";
import { RedeemProtocolFactory, RedeemProtocolRealm } from "../typechain-types";
import * as RPRByte from "../artifacts/contracts/RedeemProtocolRealm.sol/RedeemProtocolRealm.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, Contract } from "ethers";
import { _TypedDataEncoder } from "ethers/lib/utils";
import { RPC20 } from "../typechain-types/contracts/test";
import { erc20 } from "../typechain-types/@openzeppelin/contracts/token";

describe("RedeemProtocolRealm", function () {
  const zeroBytes32 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('')]);
  let chainId: number;

  this.beforeAll(async () => {
    chainId = (await ethers.provider.getNetwork()).chainId;
  })

  function getPermitData(
    owner: string,
    spender: string,
    value: BigNumberish,
    nonce: BigNumberish,
    deadline: BigNumberish,
    contractAddr: string,
    name: string,
  ) {
    return {
      domain: {
        name: name,
        version: '1',
        chainId: chainId,
        verifyingContract: contractAddr,
      },
      message: {
        owner: owner,
        spender: spender,
        value: value,
        nonce: nonce,
        deadline: deadline,
      },
      types: {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ]
      }
    }
  };

  function getMetadata(
    contractAddr: string,
    from: string,
    to: string,
    data: string,
  ) {
    return {
      domain: {
        name: 'RedeemSystemForwarder',
        version: '1.0.0',
        chainId: chainId,
        verifyingContract: contractAddr,
      },
      message: {
        from: from,
        to: to,
        value: 0,
        gas: 200000,
        nonce: 0,
        data: data,
      },
      types: {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ]
      }
    };
  };

  function getRealmInitCode(
    address: string,
    forwarder: string,
    updateFee: any,
    baseRedeemFee: any
  ) {
    const encoded = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address', 'tuple(uint256,address)', 'tuple(uint256,address)'],
      [
        address,
        forwarder,
        [
          updateFee.amount,
          updateFee.token,
        ],
        [
          baseRedeemFee.amount,
          baseRedeemFee.token,
        ]
      ]
    ).slice(2);
    return ethers.utils.keccak256(`${RPRByte.bytecode}${encoded}`);
  };

  async function createRealm(
    factory: RedeemProtocolFactory,
    realmOp: SignerWithAddress,
    tokenReceiver: string,
    forwarder: string,
    erc20: RPC20,
    method: BigNumberish,
    redeemAmount: string,
    updateFee: string,
    baseRedeemFee: string,
  ) {
    const initCode = getRealmInitCode(
      realmOp.address,
      forwarder,
      {
        amount: ethers.utils.parseEther(updateFee),
        token: erc20.address
      },
      {
        amount: ethers.utils.parseEther(baseRedeemFee),
        token: erc20.address
      }
    );
    const salt = ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [realmOp.address, chainId, 0]);
    const create2Address = ethers.utils.getCreate2Address(
      factory.address,
      ethers.utils.keccak256(salt),
      initCode,
    );

    await factory.connect(realmOp).createRealm(
      method, ethers.utils.parseEther(redeemAmount),
      tokenReceiver, forwarder, 0, 0, zeroBytes32, zeroBytes32,
    );
    
    return await ethers.getContractAt("RedeemProtocolRealm", create2Address);
  };
  
  async function deployRealm() {
    const [deployer, realmOp, otherAccount, feeReceiver] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20A.address,
      },
      feeReceiver.address,
    );
    await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
    await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
    await factory.grantRole(ethers.utils.id("REALM_CREATOR"), realmOp.address);
    const realm = await createRealm(
      factory, realmOp, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 0, "0.005", "0.01", "0.001",
    );

    return { deployer, factory, realm, realmOp, otherAccount, feeReceiver, erc20A, erc20B, erc721A, erc721B };
  };

  async function deployRealmBaseRedeemFeeMark() {
    const [deployer, realmOp, otherAccount] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20 = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721 = await erc721Factory.deploy();
    const Realm = await ethers.getContractFactory("RedeemProtocolRealm");
    const realm = await Realm.deploy(
      realmOp.address,
      ethers.constants.AddressZero,
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20.address,
      },
      {
        amount: ethers.utils.parseEther("1"),
        token: erc20.address,
      }
    );
    await realm.initialize(
      0, ethers.utils.parseEther("0.1"), ethers.constants.AddressZero,
    );

    return { realm, realmOp, otherAccount, erc20, erc721 };
  };

  async function deployRealmBaseRedeemFeeTransfer() {
    const [deployer, realmOp, otherAccount, receiver] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20 = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721 = await erc721Factory.deploy();
    const Realm = await ethers.getContractFactory("RedeemProtocolRealm");
    const realm = await Realm.deploy(
      realmOp.address,
      ethers.constants.AddressZero,
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20.address,
      },
      {
        amount: ethers.utils.parseEther("1"),
        token: erc20.address,
      }
    );
    await realm.initialize(
      1, ethers.utils.parseEther("0.1"), receiver.address,
    );

    return { realm, realmOp, otherAccount, erc20, erc721 };
  };

  async function deployRealmBaseRedeemFeeBurn() {
    const [deployer, realmOp, otherAccount] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20 = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721 = await erc721Factory.deploy();
    const Realm = await ethers.getContractFactory("RedeemProtocolRealm");
    const realm = await Realm.deploy(
      realmOp.address,
      ethers.constants.AddressZero,
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20.address,
      },
      {
        amount: ethers.utils.parseEther("1"),
        token: erc20.address,
      }
    );
    await realm.initialize(
      2, ethers.utils.parseEther("0.1"), ethers.constants.AddressZero,
    );

    return { realm, realmOp, otherAccount, erc20, erc721 };
  };

  async function deployRealmWithMultiTokensMark() {
    const [ deployer, realmOp, otherAccount, feeReceiver ] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20A.address,
      },
      feeReceiver.address,
    );
    await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
    await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
    await factory.grantRole(ethers.utils.id("REALM_CREATOR"), realmOp.address);
    const realm = await createRealm(
      factory, realmOp, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 0, "0.005", "0.01", "0.001",
    );

    return { factory, realm, realmOp, otherAccount, feeReceiver, erc20A, erc20B, erc721A, erc721B };
  };

  async function deployRealmWithMultiTokensTransfer() {
    const [ deployer, realmOp, otherAccount, receiver, feeReceiver ] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const FF = await ethers.getContractFactory("RedeemSystemForwarder");
    const forwarder = await FF.deploy();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20A.address,
      },
      feeReceiver.address,
    );
    await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
    await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
    await factory.grantRole(ethers.utils.id("REALM_CREATOR"), realmOp.address);
    const realm = await createRealm(
      factory, realmOp, receiver.address, forwarder.address, erc20A, 1, "0.005", "0.01", "0.001",
    );

    return { factory, realm, realmOp, otherAccount, receiver, erc20A, erc20B, erc721A, erc721B, forwarder };
  };

  async function deployRealmWithMultiTokensBurn() {
    const [ deployer, realmOp, otherAccount, feeReceiver ] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20A.address,
      },
      feeReceiver.address,
    );
    await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
    await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
    await factory.grantRole(ethers.utils.id("REALM_CREATOR"), realmOp.address);
    const realm = await createRealm(
      factory, realmOp, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 2, "0.005", "0.01", "0.001",
    );

    return { factory, realm, realmOp, otherAccount, erc20A, erc20B, erc721A, erc721B };
  };

  describe("permission", function () {
    it("should has ADMIN role for realmOp", async function () {
      const { realm, realmOp } = await loadFixture(deployRealm);
      expect(await realm.hasRole(ethers.utils.id("ADMIN"), realmOp.address)).to.be.true;
    });

    it("should has OPERATOR role for realmOp", async function () {
      const { realm, realmOp } = await loadFixture(deployRealm);
      expect(await realm.hasRole(ethers.utils.id("OPERATOR"), realmOp.address)).to.be.true;
    });

    it("should has ADMIN role admin for ADMIN", async function () {
      const { realm } = await loadFixture(deployRealm);
      expect(await realm.getRoleAdmin(ethers.utils.id("ADMIN"))).to.equal(ethers.utils.id("ADMIN"));
    });

    it("should has OPERATOR role admin for ADMIN", async function () {
      const { realm } = await loadFixture(deployRealm);
      expect(await realm.getRoleAdmin(ethers.utils.id("OPERATOR"))).to.equal(ethers.utils.id("ADMIN"));
    });

    it("should not have ADMIN role for other account", async function () {
      const { realm, otherAccount } = await loadFixture(deployRealm);
      expect(await realm.hasRole(ethers.utils.id("ADMIN"), otherAccount.address)).to.be.false;
    });

    it("should not have OPERATOR role for other account", async function () {
      const { realm, otherAccount } = await loadFixture(deployRealm);
      expect(await realm.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.false;
    });

    it("should be able to grant ADMIN role to other account from ADMIN", async function () {
      const { realm, realmOp, otherAccount } = await loadFixture(deployRealm);
      await realm.connect(realmOp).grantRole(ethers.utils.id("ADMIN"), otherAccount.address);
      expect(await realm.hasRole(ethers.utils.id("ADMIN"), otherAccount.address)).to.be.true;
    });

    it("should be able to grant OPERATOR role to other account from ADMIN", async function () {
      const { realm, realmOp, otherAccount } = await loadFixture(deployRealm);
      await realm.connect(realmOp).grantRole(ethers.utils.id("OPERATOR"), otherAccount.address);
      expect(await realm.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.true;
    });

    it("should not be able to grant ADMIN role to other account from non ADMIN", async function () {
      const { realm, otherAccount } = await loadFixture(deployRealm);
      await expect(realm.connect(otherAccount).grantRole(ethers.utils.id("ADMIN"), otherAccount.address))
        .to.be.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });

    it("should not be able to grant OPERATOR role to other account from non ADMIN", async function () {
      const { realm, otherAccount } = await loadFixture(deployRealm);
      await expect(realm.connect(otherAccount).grantRole(ethers.utils.id("OPERATOR"), otherAccount.address))
        .to.be.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });
  });

  describe("redeem", function () {
    enum redeemMethod {
      redeemWithMark = 1,
      redeemWithTransfer,
      redeemWithBurn
    };

    async function redeem(
      method: redeemMethod,
      factory: RedeemProtocolFactory,
      realm: RedeemProtocolRealm,
      redeemer: SignerWithAddress,
      erc20: Contract,
      erc721: Contract,
      deadline: BigNumberish,
      v: BigNumberish,
      r: string,
      s: string,
      expRealmERC20Balance: string,
      expRedeemerERC20Balance: string,
      expFeeReceiverERC20Balance: string,
    ) {
      let fn: any;
      switch(method) {
        case redeemMethod.redeemWithMark:
          fn = realm.connect(redeemer).redeemWithMark;
          break;
        case redeemMethod.redeemWithTransfer:
          fn = realm.connect(redeemer).redeemWithTransfer;
          break;
        case redeemMethod.redeemWithBurn:
          fn = realm.connect(redeemer).redeemWithBurn;
          break;
      };

      const mockCustomId = ethers.utils.formatBytes32String('mock-custom-id');
      await expect(fn(
        erc721.address, 0, mockCustomId, deadline, v, r, s,
      )).to.emit(realm, "Redeemed").withArgs(
        erc721.address, 0, method-1, redeemer.address, mockCustomId,
      );

      expect(await erc20.balanceOf(realm.address)).to.equal(ethers.utils.parseEther(expRealmERC20Balance));
      expect(await erc20.balanceOf(redeemer.address)).to.equal(ethers.utils.parseEther(expRedeemerERC20Balance));
      expect(await erc20.balanceOf(await factory.feeReceiver())).to.equal(ethers.utils.parseEther(expFeeReceiverERC20Balance));

      if (method === redeemMethod.redeemWithTransfer) {
        expect(await erc721.balanceOf(redeemer.address)).to.equal(0);
        expect(await erc721.balanceOf(await realm.tokenReceiver())).to.equal(1);
        expect(await erc721.ownerOf(0)).to.equal(await realm.tokenReceiver());
      }

      if (method === redeemMethod.redeemWithBurn) {
        expect(await erc721.balanceOf(redeemer.address)).to.equal(0);
      }
    };

    it("with mark should be success", async function () {
      const { factory, realm, otherAccount, erc20A, erc721A } = await loadFixture(deployRealmWithMultiTokensMark);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(realm.address, ethers.utils.parseEther("0.01"));
      await redeem(
        redeemMethod.redeemWithMark, factory, realm, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.004", "0.995", "0.101" // plus create realm fee
      );
    });

    it("should be reverted with second redemption", async function () {
      const { realm, otherAccount, erc20A, erc721A } = await loadFixture(deployRealmWithMultiTokensMark);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(realm.address, ethers.utils.parseEther("0.01"));
      
      await expect(realm.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, zeroBytes32, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(realm, "Redeemed").withArgs(
        erc721A.address, 0, 0, otherAccount.address, ethers.utils.formatBytes32String('DEFAULT_CUSTOM_ID'),
      );

      await expect(realm.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, zeroBytes32, 0, 0, zeroBytes32, zeroBytes32,
      )).to.be.revertedWith("Realm: token has been redeemed");
    });

    it("should be success with different custom id", async function () {
      const { realm, otherAccount, erc20A, erc721A } = await loadFixture(deployRealmWithMultiTokensMark);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));

      await erc20A.connect(otherAccount).approve(realm.address, ethers.utils.parseEther("0.01"));
      await expect(realm.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, ethers.utils.formatBytes32String('custom-id-1'), 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(realm, "Redeemed").withArgs(
        erc721A.address, 0, 0, otherAccount.address, ethers.utils.formatBytes32String('custom-id-1'),
      );

      await erc20A.connect(otherAccount).approve(realm.address, ethers.utils.parseEther("0.01"));
      await expect(realm.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, ethers.utils.formatBytes32String('custom-id-2'), 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(realm, "Redeemed").withArgs(
        erc721A.address, 0, 0, otherAccount.address, ethers.utils.formatBytes32String('custom-id-2'),
      );
    });

    it("with transfer should be success", async function () {
      const { factory, realm, otherAccount, erc20A, erc721A } = await loadFixture(deployRealmWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(realm.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(realm.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, factory, realm, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.004", "0.995", "0.101",
      );
    });

    it("permit should be success", async function () {
      const { factory, realm, otherAccount, erc20A, erc721A } = await loadFixture(deployRealmWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      const deadline = Date.now() + 60;
      const permitData = getPermitData(
        otherAccount.address, realm.address, ethers.utils.parseEther("0.005"), 0, deadline, erc20A.address, "RPC20",
      );
      const permit = await otherAccount._signTypedData(permitData.domain, permitData.types, permitData.message);
      const sig = ethers.utils.splitSignature(permit);
      await erc721A.connect(otherAccount).approve(realm.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, factory, realm, otherAccount, erc20A, erc721A, deadline, sig.v, sig.r, sig.s,
        "0.004", "0.995", "0.101",
      );
    });

    it("should success via forwarder", async function () {
      const { realm, realmOp, otherAccount, receiver, erc20A, erc721A, forwarder } = await loadFixture(deployRealmWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(forwarder.address, ethers.utils.parseEther("1"));
      
      const iface = new ethers.utils.Interface([
        "function redeemWithTransfer(address _contractAddr, uint256 _tokenId, bytes32 _customId, uint _deadline, uint8 _v, bytes32 _r, bytes32 _s)",
      ]);
      const customId1 = defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('mock-custom-id')]);
      const txData = iface.encodeFunctionData('redeemWithTransfer', [
        erc721A.address,
        0,
        customId1,
        0, 0, zeroBytes32, zeroBytes32,
      ]);
      
      const meta = getMetadata(
        forwarder.address,
        otherAccount.address,
        realm.address,
        txData,
      );
      const sig = await otherAccount._signTypedData(meta.domain, meta.types, meta.message);
      await erc721A.connect(otherAccount).approve(realm.address, 0);
      await forwarder.approve(erc20A.address, realm.address, ethers.utils.parseEther("0.01"));
      
      await forwarder.connect(realmOp).execute(
        {
          from: otherAccount.address,
          to: realm.address,
          value: 0,
          gas: 200000,
          nonce: 0,
          data: txData,
        },
        sig,
      );

      expect(await erc721A.ownerOf(0)).to.equal(receiver.address);
      expect(await erc20A.balanceOf(forwarder.address)).to.equal(ethers.utils.parseEther("0.995"));
    });

    it("should be success with empty custom id", async function () {
      const { realm, otherAccount, erc20A, erc721A } = await loadFixture(deployRealmWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(realm.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(realm.address, 0);
      
      await expect(realm.connect(otherAccount).redeemWithTransfer(
        erc721A.address, 0, zeroBytes32, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(realm, "Redeemed").withArgs(
        erc721A.address, 0, 1, otherAccount.address, ethers.utils.formatBytes32String("DEFAULT_CUSTOM_ID"),
      );
    });

    it("with burn should be success", async function () {
      const { factory, realm, otherAccount, erc20A, erc721A } = await loadFixture(deployRealmWithMultiTokensBurn);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(realm.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(realm.address, 0);
      await redeem(
        redeemMethod.redeemWithBurn, factory, realm, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.004", "0.995", "0.101",
      );
    });
  });

  describe("updateRealm", function () {
    async function updateRealm(
      realm: RedeemProtocolRealm,
      updater: SignerWithAddress,
      method: BigNumberish,
      redeemAmount: string,
      erc20: RPC20,
      tokenReceiver: string,
      deadline: BigNumberish,
      v: BigNumberish,
      r: string,
      s: string,
      expBalance: string,
      feeReceiver: string,
    ) {
      await realm.connect(updater).updateRealm(
        method, ethers.utils.parseEther(redeemAmount), tokenReceiver,
        deadline, v, r, s,
      );

      expect(await realm.redeemMethod()).to.equal(method);
      expect(await realm.tokenReceiver()).to.equal(tokenReceiver);
      expect(await erc20.balanceOf(updater.address)).to.equal(ethers.utils.parseEther(expBalance));
      expect(await erc20.balanceOf(feeReceiver)).to.equal(ethers.utils.parseEther("0.11"));
    };

    it("should update realm with mark success", async function () {
      const { realm, realmOp, erc20A, feeReceiver } = await loadFixture(deployRealm);
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(realmOp).approve(realm.address, ethers.utils.parseEther("0.01"));
      await updateRealm(
        realm, realmOp, 0, "1", erc20A, ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32, "0.99", feeReceiver.address,
      );
    });

    it("should update realm with transfer success", async function () {
      const { realm, realmOp, otherAccount, feeReceiver, erc20A } = await loadFixture(deployRealm);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(realmOp).deploy();
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(realmOp).approve(realm.address, ethers.utils.parseEther("0.01"));
      
      await updateRealm(
        realm, realmOp, 1, "1", erc20A, otherAccount.address,
        0, 0, zeroBytes32, zeroBytes32, "0.99", feeReceiver.address,
      );
    });

    it("should update realm with burn success", async function () {
      const { realm, realmOp, otherAccount, feeReceiver, erc20A } = await loadFixture(deployRealm);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(realmOp).deploy();
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(realmOp).approve(realm.address, ethers.utils.parseEther("0.01"));
      
      await updateRealm(
        realm, realmOp, 2, "1", erc20A, otherAccount.address,
        0, 0, zeroBytes32, zeroBytes32, "0.99", feeReceiver.address,
      );
    });

    it("should update realm with mark permit success", async function () {
      const { realm, realmOp, erc20A, feeReceiver } = await loadFixture(deployRealm);
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("1"));
      const deadline = Date.now() + 60;
      const permitData = getPermitData(
        realmOp.address, realm.address, ethers.utils.parseEther("0.01"), 0, deadline, erc20A.address, "RPC20",
      );
      const permit = await realmOp._signTypedData(permitData.domain, permitData.types, permitData.message);
      const sig = ethers.utils.splitSignature(permit);
      await updateRealm(
        realm, realmOp, 0, "1", erc20A, ethers.constants.AddressZero,
        deadline, sig.v, sig.r, sig.s, "0.99", feeReceiver.address,
      );
    });

    it("should be reverted when not OPERATOR role", async function () {
      const { realm, otherAccount } = await loadFixture(deployRealm);
      await expect(realm.connect(otherAccount).updateRealm(
        0, ethers.utils.parseEther("1"), ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.be.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("OPERATOR")}`);
    });

    it("should be reverted when tokenReceiver is zero address, transfer", async function () {
      const { realm, realmOp } = await loadFixture(deployRealm);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(realmOp).deploy();
      await expect(realm.connect(realmOp).updateRealm(
        1, ethers.utils.parseEther("1"), ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.be.revertedWith("Realm: tokenReceiver must be set");
    });

    it("should be reverted when redeem amount less than base redeem fee", async function () {
      const { realm, realmOp, erc20A, feeReceiver } = await loadFixture(deployRealm);
      await expect(updateRealm(
        realm, realmOp, 0, "0.0009", erc20A, ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32, "0.99", feeReceiver.address,
      )).to.be.revertedWith("Realm: redeemAmount must be greater than baseRedeemFee");
    });
  });

  describe("grantOperator", function () {
    it("should be success", async function () {
      const { realm, realmOp, otherAccount } = await loadFixture(deployRealm);
      await realm.connect(realmOp).grantOperator(otherAccount.address);
      expect(await realm.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.true;
    });

    it("should be reverted when not ADMIN role", async function () {
      const { realm, otherAccount } = await loadFixture(deployRealm);
      await expect(realm.connect(otherAccount).grantOperator(otherAccount.address))
        .to.be.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });
  });


  describe("withdraw", function () {
    it("should be success", async function () {
      const { realm, realmOp, otherAccount, erc20A } = await loadFixture(deployRealm);
      await erc20A.mint(realm.address, ethers.utils.parseEther("1"));
      await realm.connect(realmOp).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address);
      expect(await erc20A.balanceOf(otherAccount.address)).to.eq(ethers.utils.parseEther("0.9"));
      expect(await erc20A.balanceOf(realm.address)).to.equal(ethers.utils.parseEther("0.1"));
    });

    it("should be reverted when not ADMIN role", async function () {
      const { realm, otherAccount, erc20A } = await loadFixture(deployRealm);
      await expect(realm.connect(otherAccount).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address))
        .to.be.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });
  });

  describe("pause", function () {
    it("should pause success", async function () {
      const { factory, realm } = await loadFixture(deployRealm);
      await factory.pauseRealm(realm.address);
      expect(await realm.paused()).to.be.true;
    });

    it("should be reverted when not from factory", async function () {
      const { realm, realmOp } = await loadFixture(deployRealm);
      await expect(realm.connect(realmOp).pause()).to.be.revertedWith("only factory");
    });

    it("should be reverted when paused, redeemWithMark", async function () {
      const { factory, realm, otherAccount, erc721A } = await loadFixture(deployRealm);
      await factory.pauseRealm(realm.address);
      const mockCustomId = defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('mock-custom-id')]);
      await expect(realm.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, mockCustomId, 0, 0, zeroBytes32, zeroBytes32,
      )).to.be.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, updateRealm", async function () {
      const { factory, realm, realmOp } = await loadFixture(deployRealm);
      await factory.pauseRealm(realm.address);
      await expect(realm.connect(realmOp).updateRealm(
        0, ethers.utils.parseEther("1"), ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.be.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, grantOperator", async function () {
      const { factory, realm, realmOp, otherAccount } = await loadFixture(deployRealm);
      await factory.pauseRealm(realm.address);
      await expect(realm.connect(realmOp).grantOperator(otherAccount.address))
        .to.be.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, withdraw", async function () {
      const { factory, realm, realmOp, otherAccount, erc20A } = await loadFixture(deployRealm);
      await factory.pauseRealm(realm.address);
      await expect(realm.connect(realmOp).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address))
        .to.be.revertedWith("Pausable: paused");
    });
  });
});