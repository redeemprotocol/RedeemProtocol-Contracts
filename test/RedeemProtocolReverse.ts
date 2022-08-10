import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, waffle, network } from "hardhat";
import { defaultAbiCoder } from "@ethersproject/abi";
const { provider } = waffle;
import { RedeemProtocolReverse } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, Contract } from "ethers";
import { _TypedDataEncoder } from "ethers/lib/utils";
import { RPC20, RPC721 } from "../typechain-types/contracts/test";

describe("RedeemProtocolReverse", function () {
  const zeroBytes32 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
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
        chainId: provider.network.chainId,
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

  async function setBalance(
    contractAddr: string,
    token: RPC20,
    freeAmount: string,
    lockedAmount: string,
  ) {
    // lockedBalance index is 3
    const lockedSlotIndex = 3;
    const lockedSlot = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address', 'uint'], [token.address, lockedSlotIndex])
    );
    const lockedValue = ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers.utils.parseEther(lockedAmount)]);
    await network.provider.send("hardhat_setStorageAt", [ contractAddr, lockedSlot, lockedValue]);

    // freeBalance index is 4
    const freeSlotIndex = 4;
    const freeSlot = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address', 'uint'], [token.address, freeSlotIndex])
    );
    const freeValue = ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers.utils.parseEther(freeAmount)]);
    await network.provider.send("hardhat_setStorageAt", [ contractAddr, freeSlot, freeValue]);

    await token.mint(contractAddr, ethers.utils.parseEther(freeAmount));
    await token.mint(contractAddr, ethers.utils.parseEther(lockedAmount));
  };
  
  async function deployReverse() {
    const [deployer, reverseOp, otherAccount] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const Reverse = await ethers.getContractFactory("RedeemProtocolReverse");
    const reverse = await Reverse.deploy(
      reverseOp.address,
      ethers.constants.AddressZero,
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20A.address,
      }
    );
    await reverse.initialize(
      0, ethers.utils.parseEther("0.01"), [erc721A.address], ethers.constants.AddressZero,
    );

    return { deployer, reverse, reverseOp, otherAccount, erc20A, erc20B, erc721A, erc721B };
  };

  async function deployReverseBaseRedeemFeeMark() {
    const [deployer, reverseOp, otherAccount] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20 = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721 = await erc721Factory.deploy();
    const Reverse = await ethers.getContractFactory("RedeemProtocolReverse");
    const reverse = await Reverse.deploy(
      reverseOp.address,
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
    await reverse.initialize(
      0, ethers.utils.parseEther("0.1"), [erc721.address], ethers.constants.AddressZero,
    );

    return { reverse, reverseOp, otherAccount, erc20, erc721 };
  };

  async function deployReverseBaseRedeemFeeTransfer() {
    const [deployer, reverseOp, otherAccount, receiver] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20 = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721 = await erc721Factory.deploy();
    const Reverse = await ethers.getContractFactory("RedeemProtocolReverse");
    const reverse = await Reverse.deploy(
      reverseOp.address,
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
    await reverse.initialize(
      1, ethers.utils.parseEther("0.1"), [erc721.address], receiver.address,
    );

    return { reverse, reverseOp, otherAccount, erc20, erc721 };
  };

  async function deployReverseBaseRedeemFeeBurn() {
    const [deployer, reverseOp, otherAccount] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20 = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721 = await erc721Factory.deploy();
    const Reverse = await ethers.getContractFactory("RedeemProtocolReverse");
    const reverse = await Reverse.deploy(
      reverseOp.address,
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
    await reverse.initialize(
      2, ethers.utils.parseEther("0.1"), [erc721.address], ethers.constants.AddressZero,
    );

    return { reverse, reverseOp, otherAccount, erc20, erc721 };
  };

  async function deployReverseWithMultiTokensMark() {
    const [deployer, reverseOp, otherAccount] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const Reverse = await ethers.getContractFactory("RedeemProtocolReverse");
    const reverse = await Reverse.deploy(
      reverseOp.address,
      ethers.constants.AddressZero,
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20A.address,
      }
    );
    await reverse.initialize(
      0, ethers.utils.parseEther("0.01"), [erc721A.address], ethers.constants.AddressZero,
    );

    return { reverse, reverseOp, otherAccount, erc20A, erc20B, erc721A, erc721B };
  };

  async function deployReverseWithMultiTokensTransfer() {
    const [deployer, reverseOp, otherAccount, receiver] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const Reverse = await ethers.getContractFactory("RedeemProtocolReverse");
    const reverse = await Reverse.deploy(
      reverseOp.address,
      ethers.constants.AddressZero,
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20A.address,
      }
    );
    await reverse.initialize(
      1, ethers.utils.parseEther("0.01"), [erc721A.address], receiver.address,
    );

    return { reverse, reverseOp, otherAccount, erc20A, erc20B, erc721A, erc721B };
  };

  async function deployReverseWithMultiTokensBurn() {
    const [deployer, reverseOp, otherAccount] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const Reverse = await ethers.getContractFactory("RedeemProtocolReverse");
    const reverse = await Reverse.deploy(
      reverseOp.address,
      ethers.constants.AddressZero,
      {
        amount: ethers.utils.parseEther("0.01"),
        token: erc20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: erc20A.address,
      }
    );
    await reverse.initialize(
      2, ethers.utils.parseEther("0.01"), [erc721A.address], ethers.constants.AddressZero,
    );

    return { reverse, reverseOp, otherAccount, erc20A, erc20B, erc721A, erc721B };
  };

  describe("permission", function () {
    it("should has ADMIN role for reverseOp", async function () {
      const { reverse, reverseOp } = await loadFixture(deployReverse);
      expect(await reverse.hasRole(ethers.utils.id("ADMIN"), reverseOp.address)).to.be.true;
    });

    it("should has OPERATOR role for reverseOp", async function () {
      const { reverse, reverseOp } = await loadFixture(deployReverse);
      expect(await reverse.hasRole(ethers.utils.id("OPERATOR"), reverseOp.address)).to.be.true;
    });

    it("should has ADMIN role admin for ADMIN", async function () {
      const { reverse } = await loadFixture(deployReverse);
      expect(await reverse.getRoleAdmin(ethers.utils.id("ADMIN"))).to.equal(ethers.utils.id("ADMIN"));
    });

    it("should has OPERATOR role admin for ADMIN", async function () {
      const { reverse } = await loadFixture(deployReverse);
      expect(await reverse.getRoleAdmin(ethers.utils.id("OPERATOR"))).to.equal(ethers.utils.id("ADMIN"));
    });

    it("should not have ADMIN role for other account", async function () {
      const { reverse, otherAccount } = await loadFixture(deployReverse);
      expect(await reverse.hasRole(ethers.utils.id("ADMIN"), otherAccount.address)).to.be.false;
    });

    it("should not have OPERATOR role for other account", async function () {
      const { reverse, otherAccount } = await loadFixture(deployReverse);
      expect(await reverse.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.false;
    });

    it("should be able to grant ADMIN role to other account from ADMIN", async function () {
      const { reverse, reverseOp, otherAccount } = await loadFixture(deployReverse);
      await reverse.connect(reverseOp).grantRole(ethers.utils.id("ADMIN"), otherAccount.address);
      expect(await reverse.hasRole(ethers.utils.id("ADMIN"), otherAccount.address)).to.be.true;
    });

    it("should be able to grant OPERATOR role to other account from ADMIN", async function () {
      const { reverse, reverseOp, otherAccount } = await loadFixture(deployReverse);
      await reverse.connect(reverseOp).grantRole(ethers.utils.id("OPERATOR"), otherAccount.address);
      expect(await reverse.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.true;
    });

    it("should not be able to grant ADMIN role to other account from non ADMIN", async function () {
      const { reverse, otherAccount } = await loadFixture(deployReverse);
      await expect(reverse.connect(otherAccount).grantRole(ethers.utils.id("ADMIN"), otherAccount.address))
        .to.be.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });

    it("should not be able to grant OPERATOR role to other account from non ADMIN", async function () {
      const { reverse, otherAccount } = await loadFixture(deployReverse);
      await expect(reverse.connect(otherAccount).grantRole(ethers.utils.id("OPERATOR"), otherAccount.address))
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
      reverse: RedeemProtocolReverse,
      redeemer: SignerWithAddress,
      erc20: Contract,
      erc721: Contract,
      deadline: BigNumberish,
      v: BigNumberish,
      r: string,
      s: string,
      expReverseERC20Balance: string,
      expRedeemerERC20Balance: string,
      expFreeBalance: string,
      expLockedBalance: string,

    ) {
      let fn: any;
      switch(method) {
        case redeemMethod.redeemWithMark:
          fn = reverse.connect(redeemer).redeemWithMark;
          break;
        case redeemMethod.redeemWithTransfer:
          fn = reverse.connect(redeemer).redeemWithTransfer;
          break;
        case redeemMethod.redeemWithBurn:
          fn = reverse.connect(redeemer).redeemWithBurn;
          break;
      };

      const mockCustomId = ethers.utils.keccak256(defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('mock-custom-id')]));
      expect(await fn(
        erc721.address, 0, mockCustomId, deadline, v, r, s,
      )).to.emit(reverse, "Redeem").withArgs(
        erc721.address, 0, 0, redeemer.address, mockCustomId,
      );

      expect(await erc20.balanceOf(reverse.address)).to.equal(ethers.utils.parseEther(expReverseERC20Balance));
      expect(await erc20.balanceOf(redeemer.address)).to.equal(ethers.utils.parseEther(expRedeemerERC20Balance));
      expect(await reverse.freeBalance(erc20.address)).to.equal(ethers.utils.parseEther(expFreeBalance));
      expect(await reverse.lockedBalance(erc20.address)).to.equal(ethers.utils.parseEther(expLockedBalance));
    };

    it("with mark should be success", async function () {
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensMark);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await redeem(
        redeemMethod.redeemWithMark, reverse, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.01", "0.99", "0.009", "0.00",
      );
    });

    it("should be reverted with second redemption", async function () {
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensMark);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      
      expect(await reverse.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, zeroBytes32, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(reverse, "Redeem").withArgs(
        erc721A.address, 0, 0, otherAccount.address, "",
      );

      await expect(reverse.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, zeroBytes32, 0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith("token has been redeemed");
    });

    it("should be success with different custom id", async function () {
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensMark);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));

      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      const c1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('custom-id-1'));
      expect(await reverse.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, c1, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(reverse, "Redeem").withArgs(
        erc721A.address, 0, 0, otherAccount.address, "custom-id-1",
      );

      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      const c2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('custom-id-2'));
      expect(await reverse.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, c2, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(reverse, "Redeem").withArgs(
        erc721A.address, 0, 0, otherAccount.address, "custom-id-2",
      );
    });

    it("with transfer should be success", async function () {
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, reverse, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.01", "0.99", "0.009", "0.00",
      );
    });

    it("permit should be success", async function () {
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      const deadline = Date.now() + 60;
      const permitData = getPermitData(
        otherAccount.address, reverse.address, ethers.utils.parseEther("0.01"), 0, deadline, erc20A.address, "RPC20",
      );
      const permit = await otherAccount._signTypedData(permitData.domain, permitData.types, permitData.message);
      const sig = ethers.utils.splitSignature(permit);
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, reverse, otherAccount, erc20A, erc721A, deadline, sig.v, sig.r, sig.s,
        "0.01", "0.99", "0.009", "0",
      );
    });

    it("should be success with empty custom id", async function () {
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      
      expect(await reverse.connect(otherAccount).redeemWithTransfer(
        erc721A.address, 0, zeroBytes32, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(reverse, "Redeem").withArgs(
        erc721A.address, 0, 0, otherAccount.address, "",
      );
    });

    it("should deposit profit to freeBalance", async function () {
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await setBalance(reverse.address, erc20A, "1", "0.5");

      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("1"));
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, reverse, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "1.51", "0.99", "1.009", "0.5",
      );
    });

    it("with burn should be success", async function () {

      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensBurn);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithBurn, reverse, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.01", "0.99", "0.009", "0.00",
      );
    });

    it("should pay baseRedeemFee", async function () {
      const { reverse, otherAccount, erc20, erc721 } = await loadFixture(deployReverseBaseRedeemFeeTransfer);
      await erc721.safeMint(otherAccount.address);
      await erc20.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await setBalance(reverse.address, erc20, "0.4", "0.4");
      
      await erc20.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("1"));
      await erc721.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, reverse, otherAccount, erc20, erc721, 0, 0, zeroBytes32, zeroBytes32,
        "1.8", "0", "0.4", "0.4",
      );
    });

    it("should only deduct from lockedBalance", async function () {
      const { reverse, otherAccount, erc20, erc721 } = await loadFixture(deployReverseBaseRedeemFeeTransfer);
      await erc721.safeMint(otherAccount.address);
      await erc20.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await setBalance(reverse.address, erc20, "1", "1");

      await erc20.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("1"));
      await erc721.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, reverse, otherAccount, erc20, erc721, 0, 0, zeroBytes32, zeroBytes32,
        "2.1", "0.9", "1", "0.1",
      );
    });

    it("should only deduct from freeBalance", async function () {
      const { reverse, otherAccount, erc20, erc721 } = await loadFixture(deployReverseBaseRedeemFeeTransfer);
      await erc721.safeMint(otherAccount.address);
      await erc20.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await setBalance(reverse.address, erc20, "1", "0");

      await erc20.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("1"));
      await erc721.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, reverse, otherAccount, erc20, erc721, 0, 0, zeroBytes32, zeroBytes32,
        "1.1", "0.9", "0.1", "0",
      );
    });

    it("should deduct from lockedBalance first", async function () {
      const { reverse, otherAccount, erc20, erc721 } = await loadFixture(deployReverseBaseRedeemFeeTransfer);
      await erc721.safeMint(otherAccount.address);
      await erc20.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await setBalance(reverse.address, erc20, "1", "0.5");

      await erc20.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("1"));
      await erc721.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, reverse, otherAccount, erc20, erc721, 0, 0, zeroBytes32, zeroBytes32,
        "1.6", "0.9", "0.6", "0",
      );
    });
  });

  describe("getRedeemFee", function () {
    it("should be baseRedeemFee amount", async function () {
      const { reverse, erc20 } = await loadFixture(deployReverseBaseRedeemFeeMark);
      // lockedBalance index is 3
      const lockedSlotIndex = 3;
      const lockedSlot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address', 'uint'], [erc20.address, lockedSlotIndex])
      );
      const lockedValue = ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers.utils.parseEther("0.4")]);
      await network.provider.send("hardhat_setStorageAt", [ reverse.address, lockedSlot, lockedValue]);

      // freeBalance index is 4
      const freeSlotIndex = 4;
      const freeSlot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address', 'uint'], [erc20.address, freeSlotIndex])
      );
      const freeValue = ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers.utils.parseEther("0.49")]);
      await network.provider.send("hardhat_setStorageAt", [ reverse.address, freeSlot, freeValue]);
      
      const [_, amount] = await reverse.getRedeemFee();
      expect(amount).to.equal(ethers.utils.parseEther("1"));
    });

    it("should be redeemAmount", async function () {
      const { reverse, erc20 } = await loadFixture(deployReverseBaseRedeemFeeMark);
      // lockedBalance index is 3
      const lockedSlotIndex = 3;
      const lockedSlot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address', 'uint'], [erc20.address, lockedSlotIndex])
      );
      const lockedValue = ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers.utils.parseEther("0.4")]);
      await network.provider.send("hardhat_setStorageAt", [ reverse.address, lockedSlot, lockedValue]);

      // freeBalance index is 4
      const freeSlotIndex = 4;
      const freeSlot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address', 'uint'], [erc20.address, freeSlotIndex])
      );
      const freeValue = ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers.utils.parseEther("0.51")]);
      await network.provider.send("hardhat_setStorageAt", [ reverse.address, freeSlot, freeValue]);
      
      const [_, amount] = await reverse.getRedeemFee();
      expect(amount).to.equal(ethers.utils.parseEther("0.1"));
    });
  });

  describe("updateReverse", function () {
    async function updateReverse(
      reverse: RedeemProtocolReverse,
      updater: SignerWithAddress,
      method: BigNumberish,
      redeemAmount: string,
      erc20: RPC20,
      erc721: RPC721[],
      tokenReceiver: string,
      deadline: BigNumberish,
      v: BigNumberish,
      r: string,
      s: string,
      expBalance: string,
    ) {
      const e = erc721.map(i => i.address);
      await reverse.connect(updater).updateReverse(
        method, ethers.utils.parseEther(redeemAmount), e, tokenReceiver,
        deadline, v, r, s,
      );

      expect(await reverse.redeemMethod()).to.equal(method);
      expect(await reverse.redeemAmount()).to.equal(ethers.utils.parseEther("1"));
      for (let i = 0; i < e.length; i++) {
        expect(await reverse.erc721(i)).to.equal(e[i]);
      }
      expect(await reverse.tokenReceiver()).to.equal(tokenReceiver);
      expect(await erc20.balanceOf(updater.address)).to.equal(ethers.utils.parseEther(expBalance));
    };

    it("should update reverse with mark success", async function () {
      const { reverse, reverseOp, erc20A, erc721B } = await loadFixture(deployReverse);
      await erc20A.mint(reverseOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(reverseOp).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await updateReverse(
        reverse, reverseOp, 0, "1", erc20A, [erc721B], ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32, "0.99",
      );
    });

    it("should update reverse with transfer success", async function () {
      const { reverse, reverseOp, otherAccount, erc20A } = await loadFixture(deployReverse);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(reverseOp).deploy();
      await erc20A.mint(reverseOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(reverseOp).approve(reverse.address, ethers.utils.parseEther("0.01"));
      
      await updateReverse(
        reverse, reverseOp, 1, "1", erc20A, [erc721], otherAccount.address,
        0, 0, zeroBytes32, zeroBytes32, "0.99",
      );
    });

    it("should update reverse with burn success", async function () {
      const { reverse, reverseOp, otherAccount, erc20A } = await loadFixture(deployReverse);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(reverseOp).deploy();
      await erc20A.mint(reverseOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(reverseOp).approve(reverse.address, ethers.utils.parseEther("0.01"));
      
      await updateReverse(
        reverse, reverseOp, 2, "1", erc20A, [erc721], otherAccount.address,
        0, 0, zeroBytes32, zeroBytes32, "0.99",
      );
    });

    it("should update reverse with mark permit success", async function () {
      const { reverse, reverseOp, erc20A, erc721B } = await loadFixture(deployReverse);
      await erc20A.mint(reverseOp.address, ethers.utils.parseEther("1"));
      const deadline = Date.now() + 60;
      const permitData = getPermitData(
        reverseOp.address, reverse.address, ethers.utils.parseEther("0.01"), 0, deadline, erc20A.address, "RPC20",
      );
      const permit = await reverseOp._signTypedData(permitData.domain, permitData.types, permitData.message);
      const sig = ethers.utils.splitSignature(permit);
      await updateReverse(
        reverse, reverseOp, 0, "1", erc20A, [erc721B], ethers.constants.AddressZero,
        deadline, sig.v, sig.r, sig.s, "0.99",
      );
    });

    it("should be reverted when not OPERATOR role", async function () {
      const { reverse, otherAccount } = await loadFixture(deployReverse);
      await expect(reverse.connect(otherAccount).updateReverse(
        0, ethers.utils.parseEther("1"), [], ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("OPERATOR")}`);
    });

    it("should be reverted when not owner of erc721, transfer", async function () {
      const { reverse, reverseOp, erc721B } = await loadFixture(deployReverse);
      await expect(reverse.connect(reverseOp).updateReverse(
        1, ethers.utils.parseEther("1"), [erc721B.address], ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith("not ERC721 owner");
    });

    it("should be reverted when not owner of erc721, transfer", async function () {
      const { reverse, reverseOp, erc721B } = await loadFixture(deployReverse);
      await expect(reverse.connect(reverseOp).updateReverse(
        2, ethers.utils.parseEther("1"), [erc721B.address], ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith("not ERC721 owner");
    });

    it("should be reverted when tokenReceiver is zero address, transfer", async function () {
      const { reverse, reverseOp } = await loadFixture(deployReverse);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(reverseOp).deploy();
      await expect(reverse.connect(reverseOp).updateReverse(
        1, ethers.utils.parseEther("1"), [erc721.address], ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith("tokenReceiver must be set");
    });
  });

  describe("grantOperator", function () {
    it("should be success", async function () {
      const { reverse, reverseOp, otherAccount } = await loadFixture(deployReverse);
      await reverse.connect(reverseOp).grantOperator(otherAccount.address);
      expect(await reverse.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.true;
    });

    it("should be reverted when not ADMIN role", async function () {
      const { reverse, otherAccount } = await loadFixture(deployReverse);
      await expect(reverse.connect(otherAccount).grantOperator(otherAccount.address))
        .to.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });
  });

  describe("withdraw", function () {
    it("should be success", async function () {
      const { reverse, reverseOp, otherAccount, erc20A } = await loadFixture(deployReverse);
      await setBalance(reverse.address, erc20A, "1", "1");
      await reverse.connect(reverseOp).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address);
      expect(await erc20A.balanceOf(otherAccount.address)).to.eq(ethers.utils.parseEther("0.9"));
      expect(await reverse.freeBalance(erc20A.address)).to.equal(ethers.utils.parseEther("0.1"));
      expect(await reverse.lockedBalance(erc20A.address)).to.equal(ethers.utils.parseEther("1"));
    });

    it("should be reverted when not ADMIN role", async function () {
      const { reverse, otherAccount, erc20A } = await loadFixture(deployReverse);
      await expect(reverse.connect(otherAccount).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address))
        .to.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });

    it("should be reverted when not enough balance", async function () {
      const { reverse, reverseOp, otherAccount, erc20A } = await loadFixture(deployReverse);
      await setBalance(reverse.address, erc20A, "1", "1");
      await expect(reverse.connect(reverseOp).withdraw(erc20A.address, ethers.utils.parseEther("1.1"), otherAccount.address))
        .to.revertedWith("not enough balance");
    });
  });

  describe("pause", function () {
    it("should pause success", async function () {
      const { deployer, reverse } = await loadFixture(deployReverse);
      await reverse.connect(deployer).pause();
      expect(await reverse.paused()).to.be.true;
    });

    it("should be reverted when not from factory", async function () {
      const { reverse, reverseOp } = await loadFixture(deployReverse);
      await expect(reverse.connect(reverseOp).pause()).to.revertedWith("only factory");
    });

    it("should be reverted when paused, redeemWithMark", async function () {
      const { deployer, reverse, erc721A } = await loadFixture(deployReverse);
      await reverse.connect(deployer).pause();
      const mockCustomId = ethers.utils.keccak256(defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('mock-custom-id')]));
      await expect(reverse.connect(deployer).redeemWithMark(
        erc721A.address, 0, mockCustomId, 0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, updateReverse", async function () {
      const { deployer, reverse, reverseOp } = await loadFixture(deployReverse);
      await reverse.connect(deployer).pause();
      await expect(reverse.connect(reverseOp).updateReverse(
        0, ethers.utils.parseEther("1"), [], ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, grantOperator", async function () {
      const { deployer, reverse, reverseOp, otherAccount } = await loadFixture(deployReverse);
      await reverse.connect(deployer).pause();
      await expect(reverse.connect(reverseOp).grantOperator(otherAccount.address))
        .to.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, withdraw", async function () {
      const { deployer, reverse, reverseOp, otherAccount, erc20A } = await loadFixture(deployReverse);
      await reverse.connect(deployer).pause();
      await setBalance(reverse.address, erc20A, "1", "1");
      await expect(reverse.connect(reverseOp).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address))
        .to.revertedWith("Pausable: paused");
    });
  });

  describe("withdrawByFactory", function () {
    it("should be success", async function () {
      const { deployer, reverse, otherAccount, erc20A } = await loadFixture(deployReverse);
      await setBalance(reverse.address, erc20A, "1", "1");
      await erc20A.mint(reverse.address, ethers.utils.parseEther("1"));
      await reverse.connect(deployer).withdrawByFactory(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address);
      expect(await erc20A.balanceOf(reverse.address)).to.equal(ethers.utils.parseEther("2.1"));
      expect(await erc20A.balanceOf(otherAccount.address)).to.eq(ethers.utils.parseEther("0.9"));
      expect(await reverse.freeBalance(erc20A.address)).to.equal(ethers.utils.parseEther("1"));
      expect(await reverse.lockedBalance(erc20A.address)).to.equal(ethers.utils.parseEther("1"));
    });

    it("should be reverted when not from factory", async function () {
      const { reverse, reverseOp, otherAccount, erc20A } = await loadFixture(deployReverse);
      await expect(reverse.connect(reverseOp).withdrawByFactory(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address))
        .to.revertedWith("only factory");
    });
  });
});