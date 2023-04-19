import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import RedeemProtocolRealm from "../artifacts/contracts/RedeemProtocolRealm.sol/RedeemProtocolRealm.json";
import { RedeemProtocolFactory } from "../typechain-types";
import { defaultAbiCoder } from "@ethersproject/abi";
import { RPC20 } from "../typechain-types/contracts/test";

describe("RedeemProtocolFactory", function () {
  const zeroBytes32 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
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

  async function deployFactory() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, otherAccount2, feeReceiver] = await ethers.getSigners();
    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20 = await erc20Factory.deploy();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: erc20.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20.address,
      },
      feeReceiver.address,
    );

    return { factory, owner, otherAccount, otherAccount2 };
  }

  async function deployFactoryWithRole() {
    const [admin, op, realmOp, otherAccount, rootCreator, feeReceiver] = await ethers.getSigners();
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
    await factory.grantRole(ethers.utils.id("OPERATOR"), op.address);
    await factory.grantRole(ethers.utils.id("REALM_CREATOR"), realmOp.address);
    await factory.grantRole(ethers.utils.id("ROOT_CREATOR"), rootCreator.address);

    return { factory, admin, op, realmOp, otherAccount, rootCreator, erc20A, erc20B, erc721A, erc721B };
  }

  async function deployFactoryWithERC20Permit() {
    const [admin, op, realmOp, otherAccount, feeReceiver] = await ethers.getSigners();
    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20 = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721 = await erc721Factory.deploy();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: erc20.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20.address,
      },
      feeReceiver.address,
    );
    await factory.grantRole(ethers.utils.id("OPERATOR"), op.address);
    await factory.grantRole(ethers.utils.id("REALM_CREATOR"), realmOp.address);

    return { factory, admin, op, realmOp, otherAccount, erc20, erc721 };
  }

  describe("permission", function () {
    it("should have ADMIN role for owner", async function () {
      const { factory, owner } = await loadFixture(deployFactory);

      // Do NOT use UTF-8 strings that are not a DataHexstring
      // If needed, convert strings to bytes first:
      // utils.keccak256(utils.toUtf8Bytes("hello world"))
      // Or equivalently use the identity function:
      // utils.id("hello world")
      expect(await factory.hasRole(ethers.utils.id("ADMIN"), owner.address)).to.be.true;
    });

    it("should have OPERATOR role for owner", async function () {
      const { factory, owner } = await loadFixture(deployFactory);
      expect(await factory.hasRole(ethers.utils.id("OPERATOR"), owner.address)).to.be.true;
    });

    it("should have OPERATOR role admin for ADMIN", async function () {
      const { factory } = await loadFixture(deployFactory);
      expect(await factory.getRoleAdmin(ethers.utils.id("OPERATOR"))).to.equal(ethers.utils.id("ADMIN"));
    });

    it("should have REALM_CREATOR role admin for OPERATOR", async function () {
      const { factory } = await loadFixture(deployFactory);
      expect(await factory.getRoleAdmin(ethers.utils.id("REALM_CREATOR"))).to.equal(ethers.utils.id("OPERATOR"));
    });

    it("should not have ADMIN role for other account", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      expect(await factory.hasRole(ethers.utils.id("ADMIN"), otherAccount.address)).to.be.false;
    });

    it("should not have OPERATOR role for other account", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      expect(await factory.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.false;
    });

    it("should not have REALM_CREATOR role for other account", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      expect(await factory.hasRole(ethers.utils.id("REALM_CREATOR"), otherAccount.address)).to.be.false;
    });

    it("should be able to grant ADMIN role to other account from ADMIN", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      await factory.grantRole(ethers.utils.id("ADMIN"), otherAccount.address);
      expect(await factory.hasRole(ethers.utils.id("ADMIN"), otherAccount.address)).to.be.true;
    });

    it("should be able to grant OPERATOR role to other account from ADMIN", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      await factory.grantRole(ethers.utils.id("OPERATOR"), otherAccount.address);
      expect(await factory.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.true;
    });

    it("should be able to grant REALM_CREATOR role to other account from ADMIN", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      await factory.grantRole(ethers.utils.id("REALM_CREATOR"), otherAccount.address);
      expect(await factory.hasRole(ethers.utils.id("REALM_CREATOR"), otherAccount.address)).to.be.true;
    });

    it("should be able to grant ROOT_CREATOR role to other account from ADMIN", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      await factory.grantRole(ethers.utils.id("ROOT_CREATOR"), otherAccount.address);
      expect(await factory.hasRole(ethers.utils.id("ROOT_CREATOR"), otherAccount.address)).to.be.true;
    });

    it("should not be able to grant OPERATOR role to other account from non ADMIN", async function () {
      const { factory, otherAccount, otherAccount2 } = await loadFixture(deployFactory);
      await expect(factory.connect(otherAccount).grantRole(ethers.utils.id("OPERATOR"), otherAccount2.address)).to.be.revertedWith(
        `AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`
      );
    });

    it("should not be able to grant REALM_CREATOR role to other account from non ADMIN", async function () {
      const { factory, otherAccount, otherAccount2 } = await loadFixture(deployFactory);
      await expect(factory.connect(otherAccount).grantRole(ethers.utils.id("REALM_CREATOR"), otherAccount2.address)).to.be.revertedWith(
        `AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("OPERATOR")}`
      );
    });
  });

  describe("createRealm", function () {
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
      return ethers.utils.keccak256(`${RedeemProtocolRealm.bytecode}${encoded}`);
    }

    async function createRealm(
      factory: RedeemProtocolFactory,
      realmOp: SignerWithAddress,
      tokenReceiver: string,
      forwarder: string,
      erc20: RPC20,
      method: BigNumberish,
    ) {
      const initCode = getRealmInitCode(
        realmOp.address,
        forwarder,
        {
          amount: ethers.utils.parseEther("0.01"),
          token: erc20.address
        },
        {
          amount: ethers.utils.parseEther("0.001"),
          token: erc20.address
        }
      );
      const salt = ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [realmOp.address, chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await expect(factory.connect(realmOp).createRealm(
        method, ethers.utils.parseEther("0.005"),
        tokenReceiver, forwarder, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(factory, "RealmCreated").withArgs(realmOp.address, create2Address);

      expect(await factory.allRealms(0)).to.equal(create2Address);

      const realm = await ethers.getContractAt('RedeemProtocolRealm', create2Address);
      expect(await realm.factory()).to.equal(factory.address);
      expect(await realm.hasRole(ethers.utils.id("ADMIN"), realmOp.address)).to.be.true;
      expect(await realm.hasRole(ethers.utils.id("OPERATOR"), realmOp.address)).to.be.true;
      expect(await realm.getRoleAdmin(ethers.utils.id("OPERATOR"))).to.equal(ethers.utils.id("ADMIN"));
      expect(await realm.redeemAmount()).to.equal(ethers.utils.parseEther("0.005"));
      expect(await realm.redeemMethod()).to.equal(method);
      expect(await realm.tokenReceiver()).to.equal(tokenReceiver);

      // TODO: maybe we can shorten this test
      const updateFee = await realm.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("0.01"));
      expect(updateFee.token).to.equal(erc20.address);
      const baseRedeemFee = await realm.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("0.001"));
      expect(baseRedeemFee.token).to.equal(erc20.address);
      const feeReceiver = await factory.feeReceiver()
      expect(await erc20.balanceOf(feeReceiver)).to.equal(ethers.utils.parseEther("0.1"));
    };

    it("should create successfully with mark", async () => {
      // NOTE: must place await
      const { factory, realmOp, erc20A } = await loadFixture(deployFactoryWithRole);
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
      await createRealm(factory, realmOp, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 0);
    });

    it("should create successfully with transfer", async () => {
      const { factory, realmOp, otherAccount, erc20A } = await loadFixture(deployFactoryWithRole);
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));

      await createRealm(factory, realmOp, otherAccount.address, ethers.constants.AddressZero, erc20A, 1);
    });

    it("should create successfully with burn", async () => {
      const { factory, realmOp, erc20A } = await loadFixture(deployFactoryWithRole);
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
      await createRealm(factory, realmOp, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 2);
    });

    it("should create successfully with ROOT_CREATOR and approved only", async function () {
      const { factory, rootCreator, erc20A } = await loadFixture(deployFactoryWithRole);
      await erc20A.mint(rootCreator.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(rootCreator).approve(factory.address, ethers.utils.parseEther("0.1"));
      await createRealm(factory, rootCreator, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 0);
    });

    it("should create successfully with ROOT_CREATOR and not ERC721 owner", async function () {
      const { factory, rootCreator, otherAccount, erc20A } = await loadFixture(deployFactoryWithRole);
      await erc20A.mint(rootCreator.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(rootCreator).approve(factory.address, ethers.utils.parseEther("0.1"));
      await createRealm(factory, rootCreator, otherAccount.address, ethers.constants.AddressZero, erc20A, 1);
    });

    it("should create successfully with non REALM_CREATOR when not approved only", async function () {
      const { factory, otherAccount, erc20A } = await loadFixture(deployFactoryWithRole);
      await factory.flipApprovedOnly();
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(otherAccount).approve(factory.address, ethers.utils.parseEther("0.1"));
      await createRealm(factory, otherAccount, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 0);
    });

    it("should be reverted for non realm operator", async function () {
      const { factory, op } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(op).createRealm(
        0, ethers.utils.parseEther("0.1"),
        ethers.constants.AddressZero, ethers.constants.AddressZero, 0, 0, zeroBytes32, zeroBytes32,
      )).to.be.revertedWith("not realm operator");
    });

    it("should be reverted for transfer method and tokenReceiver is zero address", async function () {
      const { factory, realmOp } = await loadFixture(deployFactoryWithRole);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(realmOp).deploy();
      await expect(factory.connect(realmOp).createRealm(
        1, ethers.utils.parseEther("0.1"),
        ethers.constants.AddressZero, ethers.constants.AddressZero, 0, 0, zeroBytes32, zeroBytes32,
      )).to.be.revertedWith("tokenReceiver must be set");
    });

    it("should create successfully with designate setup fee", async function () {
      const { factory, realmOp, otherAccount, erc20A, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.setDesignateSetupFee(realmOp.address, ethers.utils.parseEther("1"), erc20B.address);

      const initCode = getRealmInitCode(
        realmOp.address,
        ethers.constants.AddressZero,
        {
          amount: ethers.utils.parseEther("0.01"),
          token: erc20A.address
        },
        {
          amount: ethers.utils.parseEther("0.001"),
          token: erc20A.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [realmOp.address, chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(realmOp).deploy();
      await erc20B.mint(realmOp.address, ethers.utils.parseEther("1"));
      await erc20B.connect(realmOp).approve(factory.address, ethers.utils.parseEther("1"));
      await expect(factory.connect(realmOp).createRealm(
        1, ethers.utils.parseEther("0.005"),
        otherAccount.address, ethers.constants.AddressZero, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(factory, "RealmCreated").withArgs(realmOp.address, create2Address);
    });

    it("should create sucessfully with designate update fee", async function () {
      const { factory, realmOp, otherAccount, erc20A, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.setDesignateUpdateFee(realmOp.address, ethers.utils.parseEther("1"), erc20B.address);

      const initCode = getRealmInitCode(
        realmOp.address,
        ethers.constants.AddressZero,
        {
          amount: ethers.utils.parseEther("1"),
          token: erc20B.address
        },
        {
          amount: ethers.utils.parseEther("0.001"),
          token: erc20A.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [realmOp.address, chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(realmOp).deploy();
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
      await expect(factory.connect(realmOp).createRealm(
        1, ethers.utils.parseEther("0.005"),
        otherAccount.address, ethers.constants.AddressZero, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(factory, "RealmCreated").withArgs(realmOp.address, create2Address);

      const realm = await ethers.getContractAt('RedeemProtocolRealm', create2Address);
      const updateFee = await realm.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(updateFee.token).to.equal(erc20B.address);
    });

    it("should create sucessfully with designate base redeem fee", async function () {
      const { factory, realmOp, otherAccount, erc20A, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(erc20B.address);
      await factory.setDesignateBaseRedeemFee(realmOp.address, ethers.utils.parseEther("1"), erc20B.address);

      const initCode = getRealmInitCode(
        realmOp.address,
        ethers.constants.AddressZero,
        {
          amount: ethers.utils.parseEther("0.01"),
          token: erc20A.address
        },
        {
          amount: ethers.utils.parseEther("1"),
          token: erc20B.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [realmOp.address, chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      const erc721Factory = await ethers.getContractFactory("RPC721");
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
      await expect(factory.connect(realmOp).createRealm(
        1, ethers.utils.parseEther("1.1"),
        otherAccount.address, ethers.constants.AddressZero, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(factory, "RealmCreated").withArgs(realmOp.address, create2Address);

      const realm = await ethers.getContractAt('RedeemProtocolRealm', create2Address);
      const baseRedeemFee = await realm.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(baseRedeemFee.token).to.equal(erc20B.address);
    });

    it("should create sucessfully with permit", async function () {
      const { factory, realmOp, otherAccount, erc20A } = await loadFixture(deployFactoryWithRole);

      const initCode = getRealmInitCode(
        realmOp.address,
        ethers.constants.AddressZero,
        {
          amount: ethers.utils.parseEther("0.01"),
          token: erc20A.address
        },
        {
          amount: ethers.utils.parseEther("0.001"),
          token: erc20A.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [realmOp.address, chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      const deadline = Date.now() + 60;
      const permitData = getPermitData(
        realmOp.address, factory.address, ethers.utils.parseEther("0.1"), 0, deadline, erc20A.address, "RPC20",
      );
      const permit = await realmOp._signTypedData(permitData.domain, permitData.types, permitData.message);
      const sig = ethers.utils.splitSignature(permit);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(realmOp).deploy();
      await erc20A.mint(realmOp.address, ethers.utils.parseEther("0.1"));
      await erc20A.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
      await expect(factory.connect(realmOp).createRealm(
        1, ethers.utils.parseEther("0.005"),
        otherAccount.address, ethers.constants.AddressZero, deadline, sig.v, sig.r, sig.s,
      )).to.emit(factory, "RealmCreated").withArgs(realmOp.address, create2Address);
    });
  });

  describe("flipApprovedOnly", function () {
    it("should be false", async function () {
      const { factory } = await loadFixture(deployFactoryWithRole);
      await factory.flipApprovedOnly();
      expect(await factory.approveOnly()).to.equal(false);
    });

    it("should be reverted when not OPERATOR role", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .flipApprovedOnly())
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });
  });

  describe("set default config", function () {
    it("defaultSetupFee success", async function () {
      const { factory, op, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).setDefaultSetupFee(ethers.utils.parseEther("1"), erc20B.address);

      const deafultSetupFee = await factory.defaultSetupFee();
      expect(deafultSetupFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(deafultSetupFee.token).to.equal(erc20B.address);
    });

    it("defaultSetupFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .setDefaultSetupFee(ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("defaultUpdateFee success", async function () {
      const { factory, op, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).setDefaultUpdateFee(ethers.utils.parseEther("1"), erc20B.address);

      const defaultUpdateFee = await factory.defaultUpdateFee();
      expect(defaultUpdateFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(defaultUpdateFee.token).to.equal(erc20B.address);
    });

    it("defaultUpdateFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .setDefaultUpdateFee(ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("defaultBaseRedeemFee success", async function () {
      const { factory, op, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(erc20B.address);
      await factory.connect(op).setDefaultBaseRedeemFee(ethers.utils.parseEther("1"), erc20B.address);

      const defaultBaseRedeemFee = await factory.defaultBaseRedeemFee();
      expect(defaultBaseRedeemFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(defaultBaseRedeemFee.token).to.equal(erc20B.address);
    });

    it("defaultBaseRedeemFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(erc20B.address);
      await expect(factory.connect(otherAccount)
        .setDefaultBaseRedeemFee(ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("defaultBaseRedeemFee reverted when token is acceptable", async function () {
      const { factory, op, erc20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(op)
        .setDefaultBaseRedeemFee(ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("not acceptable token");
    });
  });

  describe("set designate config", function () {
    it("setDesignateSetupFee success", async function () {
      const { factory, op, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).setDesignateSetupFee(otherAccount.address, ethers.utils.parseEther("1"), erc20B.address);

      const designateSetupFee = await factory.designateSetupFee(otherAccount.address);
      expect(designateSetupFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(designateSetupFee.token).to.equal(erc20B.address);
    });

    it("setDesignateSetupFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .setDesignateSetupFee(otherAccount.address, ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setDesignateUpdateFee success", async function () {
      const { factory, op, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).setDesignateUpdateFee(otherAccount.address, ethers.utils.parseEther("1"), erc20B.address);

      const designateUpdateFee = await factory.designateUpdateFee(otherAccount.address);
      expect(designateUpdateFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(designateUpdateFee.token).to.equal(erc20B.address);
    });

    it("setDesignateUpdateFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .setDesignateUpdateFee(otherAccount.address, ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setDesignateBaseRedeemFee success", async function () {
      const { factory, op, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(erc20B.address);
      await factory.connect(op).setDesignateBaseRedeemFee(otherAccount.address, ethers.utils.parseEther("1"), erc20B.address);

      const designateBaseRedeemFee = await factory.designateBaseRedeemFee(otherAccount.address);
      expect(designateBaseRedeemFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(designateBaseRedeemFee.token).to.equal(erc20B.address);
    });

    it("setDesignateBaseRedeemFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(erc20B.address);
      await expect(factory.connect(otherAccount)
        .setDesignateBaseRedeemFee(otherAccount.address, ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setDesignateBaseRedeemFee reverted when token is not acceptable", async function () {
      const { factory, op, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(op)
        .setDesignateBaseRedeemFee(otherAccount.address, ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("not acceptable token");
    });
  });

  describe("flipValidRedeemToken", function () {
    it("should be true", async function () {
      const { factory, op, erc20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).flipValidRedeemToken(erc20B.address);
      const isValid = await factory.validRedeemToken(erc20B.address);
      expect(isValid).to.be.true;
    });

    it("should be reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, erc20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .flipValidRedeemToken(erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("should be true flip twice", async function () {
      const { factory, op, erc20B } = await loadFixture(deployFactoryWithRole);

      await factory.connect(op).flipValidRedeemToken(erc20B.address);
      const first = await factory.validRedeemToken(erc20B.address);
      expect(first).to.be.true;

      await factory.connect(op).flipValidRedeemToken(erc20B.address);
      const second = await factory.validRedeemToken(erc20B.address);
      expect(second).to.be.false;
    });
  });

  describe("set realm config", function () {
    async function createRealm(
      factory: RedeemProtocolFactory,
      realmOp: SignerWithAddress,
      erc20: RPC20,
    ) {
      const encoded = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'tuple(uint256,address)', 'tuple(uint256,address)'],
        [
          realmOp.address,
          ethers.constants.AddressZero,
          [
            ethers.utils.parseEther("0.01"),
            erc20.address
          ],
          [
            ethers.utils.parseEther("0.001"),
            erc20.address
          ]
        ]
      ).slice(2);
      const initCode = ethers.utils.keccak256(`${RedeemProtocolRealm.bytecode}${encoded}`);
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [realmOp.address, chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await erc20.mint(realmOp.address, ethers.utils.parseEther("0.1"));
      await erc20.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
      await expect(factory.connect(realmOp).createRealm(
        0, ethers.utils.parseEther("0.005"),
        ethers.constants.AddressZero, ethers.constants.AddressZero, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(factory, "RealmCreated").withArgs(realmOp.address, create2Address);

      expect(await factory.allRealms(0)).to.equal(create2Address);

      const realm = await ethers.getContractAt('RedeemProtocolRealm', create2Address);
      expect(await realm.factory()).to.equal(factory.address);
      expect(await realm.hasRole(ethers.utils.id("ADMIN"), realmOp.address)).to.be.true;
      expect(await realm.hasRole(ethers.utils.id("OPERATOR"), realmOp.address)).to.be.true;
      expect(await realm.getRoleAdmin(ethers.utils.id("OPERATOR"))).to.equal(ethers.utils.id("ADMIN"));
      expect(await realm.redeemAmount()).to.equal(ethers.utils.parseEther("0.005"));
      expect(await realm.redeemMethod()).to.equal(0);
      expect(await realm.tokenReceiver()).to.equal(ethers.constants.AddressZero);

      // TODO: maybe we can shorten this test
      const updateFee = await realm.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("0.01"));
      expect(updateFee.token).to.equal(erc20.address);
      const baseRedeemFee = await realm.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("0.001"));
      expect(baseRedeemFee.token).to.equal(erc20.address);

      return create2Address;
    };

    it("setUpdateFee success", async function () {
      const { factory, op, realmOp, erc20A, erc20B, erc721A } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await factory.connect(op).setUpdateFee(realmAddr, ethers.utils.parseEther("1"), erc20B.address);

      const realm = await ethers.getContractAt('RedeemProtocolRealm', realmAddr);
      const updateFee = await realm.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(updateFee.token).to.equal(erc20B.address);
    });

    it("setUpdateFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, realmOp, erc20A, erc20B, erc721A } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await expect(factory.connect(otherAccount)
        .setUpdateFee(realmAddr, ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setBaseRedeemFee success", async function () {
      const { factory, op, realmOp, erc20A, erc20B, erc721A } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await factory.connect(op).setBaseRedeemFee(realmAddr, ethers.utils.parseEther("1"), erc20B.address);

      const realm = await ethers.getContractAt('RedeemProtocolRealm', realmAddr);
      const baseRedeemFee = await realm.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(baseRedeemFee.token).to.equal(erc20B.address);
      expect(await realm.redeemAmount()).to.equal(ethers.utils.parseEther("1"));
    });

    it("setBaseRedeemFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, realmOp, erc20A, erc20B } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await expect(factory.connect(otherAccount)
        .setBaseRedeemFee(realmAddr, ethers.utils.parseEther("1"), erc20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setRedeemAmount success", async function () {
      const { factory, op, realmOp, erc20A } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await factory.connect(op).setRedeemAmount(realmAddr, ethers.utils.parseEther("1"));

      const realm = await ethers.getContractAt('RedeemProtocolRealm', realmAddr);
      expect(await realm.redeemAmount()).to.equal(ethers.utils.parseEther("1"));
    });

    it("setRedeemAmount reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, realmOp, erc20A } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await expect(factory.connect(otherAccount)
        .setRedeemAmount(realmAddr, ethers.utils.parseEther("1")))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setRedeemAmount reverted when redeemAmount less than baseRedeemFee", async function () {
      const { factory, op, realmOp, erc20A } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await expect(factory.connect(op).setRedeemAmount(realmAddr, ethers.utils.parseEther("0.0009")))
        .to.be.revertedWith("Realm: redeemAmount must be greater than baseRedeemFee");
    });
  });

  describe("admin methods", function () {
    async function createRealm(
      factory: RedeemProtocolFactory,
      realmOp: SignerWithAddress,
      erc20: RPC20,
    ) {
      const encoded = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'tuple(uint256,address)', 'tuple(uint256,address)'],
        [
          realmOp.address,
          ethers.constants.AddressZero,
          [
            ethers.utils.parseEther("0.01"),
            erc20.address
          ],
          [
            ethers.utils.parseEther("0.001"),
            erc20.address
          ]
        ]
      ).slice(2);
      const initCode = ethers.utils.keccak256(`${RedeemProtocolRealm.bytecode}${encoded}`);
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [realmOp.address, chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await erc20.mint(realmOp.address, ethers.utils.parseEther("0.1"));
      await erc20.connect(realmOp).approve(factory.address, ethers.utils.parseEther("0.1"));
      await expect(factory.connect(realmOp).createRealm(
        0, ethers.utils.parseEther("0.005"),
        ethers.constants.AddressZero, ethers.constants.AddressZero, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(factory, "RealmCreated").withArgs(realmOp.address, create2Address);

      expect(await factory.allRealms(0)).to.equal(create2Address);

      const realm = await ethers.getContractAt('RedeemProtocolRealm', create2Address);
      expect(await realm.factory()).to.equal(factory.address);
      expect(await realm.hasRole(ethers.utils.id("ADMIN"), realmOp.address)).to.be.true;
      expect(await realm.hasRole(ethers.utils.id("OPERATOR"), realmOp.address)).to.be.true;
      expect(await realm.getRoleAdmin(ethers.utils.id("OPERATOR"))).to.equal(ethers.utils.id("ADMIN"));
      expect(await realm.redeemAmount()).to.equal(ethers.utils.parseEther("0.005"));
      expect(await realm.redeemMethod()).to.equal(0);
      expect(await realm.tokenReceiver()).to.equal(ethers.constants.AddressZero);

      // TODO: maybe we can shorten this test
      const updateFee = await realm.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("0.01"));
      expect(updateFee.token).to.equal(erc20.address);
      const baseRedeemFee = await realm.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("0.001"));
      expect(baseRedeemFee.token).to.equal(erc20.address);

      return create2Address;
    };

    it("pauseRealm should success", async function () {
      const { factory, realmOp, erc20A } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await factory.pauseRealm(realmAddr);

      const realm = await ethers.getContractAt('RedeemProtocolRealm', realmAddr);
      expect(await realm.paused()).to.be.true;
    });

    it("pauseRealm should be reverted when not ADMIN role", async function () {
      const { factory, realmOp, otherAccount, erc20A } = await loadFixture(deployFactoryWithRole);
      const realmAddr = await createRealm(factory, realmOp, erc20A);
      await expect(factory.connect(otherAccount).pauseRealm(realmAddr))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42");
    });

    it("withdraw should success", async function () {
      const { factory, otherAccount, erc20A } = await loadFixture(deployFactoryWithRole);
      await erc20A.mint(factory.address, ethers.utils.parseEther("1"));
      await factory.withdraw(erc20A.address, ethers.utils.parseEther("1"), otherAccount.address);
      expect(await erc20A.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseEther("1"));
    });

    it("withdraw should be reverted when not enougn balance", async function () {
      const { factory, otherAccount, erc20A } = await loadFixture(deployFactoryWithRole);
      await erc20A.mint(factory.address, ethers.utils.parseEther("0.99"));
      await expect(factory.withdraw(erc20A.address, ethers.utils.parseEther("1"), otherAccount.address))
        .to.be.revertedWith("not enough balance");
    });

    it("withdraw should be reverted when not ADMIN role", async function () {
      const { factory, otherAccount, erc20A } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount).withdraw(erc20A.address, ethers.utils.parseEther("1"), otherAccount.address))
        .to.be.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });

    it("setFeeReceiver should success", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactoryWithRole);
      await factory.setFeeReceiver(otherAccount.address);
      expect(await factory.feeReceiver()).to.equal(otherAccount.address);
    });
  });
});