import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, waffle, network } from "hardhat";
import { defaultAbiCoder } from "@ethersproject/abi";
const { provider } = waffle;
import { RedeemProtocolFactory, RedeemProtocolReverse } from "../typechain-types";
import * as RPRByte from "../artifacts/contracts/RedeemProtocolReverse.sol/RedeemProtocolReverse.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, Contract } from "ethers";
import { _TypedDataEncoder } from "ethers/lib/utils";
import { RPC20 } from "../typechain-types/contracts/test";
import { erc20 } from "../typechain-types/@openzeppelin/contracts/token";

describe("RedeemProtocolReverse", function () {
  const zeroBytes32 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('')]);
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

  function getMetadata(
    contractAddr: string,
    from: string,
    to: string,
    data: string,
  ) {
    return {
      domain: {
        name: 'MinimalForwarder',
        version: '0.0.1',
        chainId: provider.network.chainId,
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

  function getReverseInitCode(
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

  async function createReverse(
    factory: RedeemProtocolFactory,
    reverseOp: SignerWithAddress,
    tokenReceiver: string,
    forwarder: string,
    erc20: RPC20,
    method: BigNumberish,
    redeemAmount: string,
    updateFee: string,
    baseRedeemFee: string,
  ) {
    const initCode = getReverseInitCode(
      reverseOp.address,
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
    const salt = ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [reverseOp.address, provider.network.chainId, 0]);
    const create2Address = ethers.utils.getCreate2Address(
      factory.address,
      ethers.utils.keccak256(salt),
      initCode,
    );

    await factory.connect(reverseOp).createReverse(
      method, ethers.utils.parseEther(redeemAmount),
      tokenReceiver, forwarder, 0, 0, zeroBytes32, zeroBytes32,
    );
    
    return await ethers.getContractAt("RedeemProtocolReverse", create2Address);
  };
  
  async function deployReverse() {
    const [deployer, reverseOp, otherAccount, feeReceiver] = await ethers.getSigners();

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
    await erc20A.mint(reverseOp.address, ethers.utils.parseEther("0.1"));
    await erc20A.connect(reverseOp).approve(factory.address, ethers.utils.parseEther("0.1"));
    await factory.grantRole(ethers.utils.id("REVERSE_CREATOR"), reverseOp.address);
    const reverse = await createReverse(
      factory, reverseOp, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 0, "0.005", "0.01", "0.001",
    );

    return { deployer, factory, reverse, reverseOp, otherAccount, feeReceiver, erc20A, erc20B, erc721A, erc721B };
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
      0, ethers.utils.parseEther("0.1"), ethers.constants.AddressZero,
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
      1, ethers.utils.parseEther("0.1"), receiver.address,
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
      2, ethers.utils.parseEther("0.1"), ethers.constants.AddressZero,
    );

    return { reverse, reverseOp, otherAccount, erc20, erc721 };
  };

  async function deployReverseWithMultiTokensMark() {
    const [ deployer, reverseOp, otherAccount, feeReceiver ] = await ethers.getSigners();

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
    await erc20A.mint(reverseOp.address, ethers.utils.parseEther("0.1"));
    await erc20A.connect(reverseOp).approve(factory.address, ethers.utils.parseEther("0.1"));
    await factory.grantRole(ethers.utils.id("REVERSE_CREATOR"), reverseOp.address);
    const reverse = await createReverse(
      factory, reverseOp, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 0, "0.005", "0.01", "0.001",
    );

    return { factory, reverse, reverseOp, otherAccount, feeReceiver, erc20A, erc20B, erc721A, erc721B };
  };

  async function deployReverseWithMultiTokensTransfer() {
    const [ deployer, reverseOp, otherAccount, receiver, feeReceiver ] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory("RPC20");
    const erc20A = await erc20Factory.deploy();
    const erc20B = await erc20Factory.deploy();
    const erc721Factory = await ethers.getContractFactory("RPC721");
    const erc721A = await erc721Factory.deploy();
    const erc721B = await erc721Factory.deploy();
    const FF = await ethers.getContractFactory("MinimalForwarder");
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
    await erc20A.mint(reverseOp.address, ethers.utils.parseEther("0.1"));
    await erc20A.connect(reverseOp).approve(factory.address, ethers.utils.parseEther("0.1"));
    await factory.grantRole(ethers.utils.id("REVERSE_CREATOR"), reverseOp.address);
    const reverse = await createReverse(
      factory, reverseOp, receiver.address, forwarder.address, erc20A, 1, "0.005", "0.01", "0.001",
    );

    return { factory, reverse, reverseOp, otherAccount, receiver, erc20A, erc20B, erc721A, erc721B, forwarder };
  };

  async function deployReverseWithMultiTokensBurn() {
    const [ deployer, reverseOp, otherAccount, feeReceiver ] = await ethers.getSigners();

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
    await erc20A.mint(reverseOp.address, ethers.utils.parseEther("0.1"));
    await erc20A.connect(reverseOp).approve(factory.address, ethers.utils.parseEther("0.1"));
    await factory.grantRole(ethers.utils.id("REVERSE_CREATOR"), reverseOp.address);
    const reverse = await createReverse(
      factory, reverseOp, ethers.constants.AddressZero, ethers.constants.AddressZero, erc20A, 2, "0.005", "0.01", "0.001",
    );

    return { factory, reverse, reverseOp, otherAccount, erc20A, erc20B, erc721A, erc721B };
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
      factory: RedeemProtocolFactory,
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
      expFeeReceiverERC20Balance: string,
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

      const mockCustomId = ethers.utils.formatBytes32String('mock-custom-id');
      await expect(fn(
        erc721.address, 0, mockCustomId, deadline, v, r, s,
      )).to.emit(reverse, "Redeemed").withArgs(
        erc721.address, 0, method-1, redeemer.address, mockCustomId,
      );

      expect(await erc20.balanceOf(reverse.address)).to.equal(ethers.utils.parseEther(expReverseERC20Balance));
      expect(await erc20.balanceOf(redeemer.address)).to.equal(ethers.utils.parseEther(expRedeemerERC20Balance));
      expect(await erc20.balanceOf(await factory.feeReceiver())).to.equal(ethers.utils.parseEther(expFeeReceiverERC20Balance));

      if (method === redeemMethod.redeemWithTransfer) {
        expect(await erc721.balanceOf(redeemer.address)).to.equal(0);
        expect(await erc721.balanceOf(await reverse.tokenReceiver())).to.equal(1);
        expect(await erc721.ownerOf(0)).to.equal(await reverse.tokenReceiver());
      }

      if (method === redeemMethod.redeemWithBurn) {
        expect(await erc721.balanceOf(redeemer.address)).to.equal(0);
      }
    };

    it("with mark should be success", async function () {
      const { factory, reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensMark);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await redeem(
        redeemMethod.redeemWithMark, factory, reverse, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.004", "0.995", "0.101" // plus create reverse fee
      );
    });

    it("should be reverted with second redemption", async function () {
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensMark);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      
      await expect(reverse.connect(otherAccount).redeemWithMark(
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
      const c1 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('custom-id-1')]);
      await expect(reverse.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, c1, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(reverse, "Redeem").withArgs(
        erc721A.address, 0, 0, otherAccount.address, "custom-id-1",
      );

      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      const c2 = ethers.utils.defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('custom-id-2')]);
      await expect(reverse.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, c2, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(reverse, "Redeem").withArgs(
        erc721A.address, 0, 0, otherAccount.address, "custom-id-2",
      );
    });

    it("with transfer should be success", async function () {
      const { factory, reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, factory, reverse, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.004", "0.995", "0.101",
      );
    });

    it("permit should be success", async function () {
      const { factory, reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      const deadline = Date.now() + 60;
      const permitData = getPermitData(
        otherAccount.address, reverse.address, ethers.utils.parseEther("0.005"), 0, deadline, erc20A.address, "RPC20",
      );
      const permit = await otherAccount._signTypedData(permitData.domain, permitData.types, permitData.message);
      const sig = ethers.utils.splitSignature(permit);
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithTransfer, factory, reverse, otherAccount, erc20A, erc721A, deadline, sig.v, sig.r, sig.s,
        "0.004", "0.995", "0.101",
      );
    });

    it("should success via forwarder", async function () {
      const { reverse, reverseOp, otherAccount, receiver, erc20A, erc721A, forwarder } = await loadFixture(deployReverseWithMultiTokensTransfer);
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
        reverse.address,
        txData,
      );
      const sig = await otherAccount._signTypedData(meta.domain, meta.types, meta.message);
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      await forwarder.approve(erc20A.address, reverse.address, ethers.utils.parseEther("0.01"));
      
      await forwarder.connect(reverseOp).execute(
        {
          from: otherAccount.address,
          to: reverse.address,
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
      const { reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensTransfer);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      
      await expect(reverse.connect(otherAccount).redeemWithTransfer(
        erc721A.address, 0, zeroBytes32, 0, 0, zeroBytes32, zeroBytes32,
      )).to.emit(reverse, "Redeem").withArgs(
        erc721A.address, 0, 0, otherAccount.address, "",
      );
    });

    it("with burn should be success", async function () {
      const { factory, reverse, otherAccount, erc20A, erc721A } = await loadFixture(deployReverseWithMultiTokensBurn);
      await erc721A.safeMint(otherAccount.address);
      await erc20A.mint(otherAccount.address, ethers.utils.parseEther("1"));
      await erc20A.connect(otherAccount).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await erc721A.connect(otherAccount).approve(reverse.address, 0);
      await redeem(
        redeemMethod.redeemWithBurn, factory, reverse, otherAccount, erc20A, erc721A, 0, 0, zeroBytes32, zeroBytes32,
        "0.004", "0.995", "0.101",
      );
    });
  });

  describe("updateReverse", function () {
    async function updateReverse(
      reverse: RedeemProtocolReverse,
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
      await reverse.connect(updater).updateReverse(
        method, ethers.utils.parseEther(redeemAmount), tokenReceiver,
        deadline, v, r, s,
      );

      expect(await reverse.redeemMethod()).to.equal(method);
      expect(await reverse.tokenReceiver()).to.equal(tokenReceiver);
      expect(await erc20.balanceOf(updater.address)).to.equal(ethers.utils.parseEther(expBalance));
      expect(await erc20.balanceOf(feeReceiver)).to.equal(ethers.utils.parseEther("0.11"));
    };

    it("should update reverse with mark success", async function () {
      const { reverse, reverseOp, erc20A, feeReceiver } = await loadFixture(deployReverse);
      await erc20A.mint(reverseOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(reverseOp).approve(reverse.address, ethers.utils.parseEther("0.01"));
      await updateReverse(
        reverse, reverseOp, 0, "1", erc20A, ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32, "0.99", feeReceiver.address,
      );
    });

    it("should update reverse with transfer success", async function () {
      const { reverse, reverseOp, otherAccount, feeReceiver, erc20A } = await loadFixture(deployReverse);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(reverseOp).deploy();
      await erc20A.mint(reverseOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(reverseOp).approve(reverse.address, ethers.utils.parseEther("0.01"));
      
      await updateReverse(
        reverse, reverseOp, 1, "1", erc20A, otherAccount.address,
        0, 0, zeroBytes32, zeroBytes32, "0.99", feeReceiver.address,
      );
    });

    it("should update reverse with burn success", async function () {
      const { reverse, reverseOp, otherAccount, feeReceiver, erc20A } = await loadFixture(deployReverse);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(reverseOp).deploy();
      await erc20A.mint(reverseOp.address, ethers.utils.parseEther("1"));
      await erc20A.connect(reverseOp).approve(reverse.address, ethers.utils.parseEther("0.01"));
      
      await updateReverse(
        reverse, reverseOp, 2, "1", erc20A, otherAccount.address,
        0, 0, zeroBytes32, zeroBytes32, "0.99", feeReceiver.address,
      );
    });

    it("should update reverse with mark permit success", async function () {
      const { reverse, reverseOp, erc20A, feeReceiver } = await loadFixture(deployReverse);
      await erc20A.mint(reverseOp.address, ethers.utils.parseEther("1"));
      const deadline = Date.now() + 60;
      const permitData = getPermitData(
        reverseOp.address, reverse.address, ethers.utils.parseEther("0.01"), 0, deadline, erc20A.address, "RPC20",
      );
      const permit = await reverseOp._signTypedData(permitData.domain, permitData.types, permitData.message);
      const sig = ethers.utils.splitSignature(permit);
      await updateReverse(
        reverse, reverseOp, 0, "1", erc20A, ethers.constants.AddressZero,
        deadline, sig.v, sig.r, sig.s, "0.99", feeReceiver.address,
      );
    });

    it("should be reverted when not OPERATOR role", async function () {
      const { reverse, otherAccount } = await loadFixture(deployReverse);
      await expect(reverse.connect(otherAccount).updateReverse(
        0, ethers.utils.parseEther("1"), ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("OPERATOR")}`);
    });

    it("should be reverted when tokenReceiver is zero address, transfer", async function () {
      const { reverse, reverseOp } = await loadFixture(deployReverse);
      const erc721Factory = await ethers.getContractFactory("RPC721");
      const erc721 = await erc721Factory.connect(reverseOp).deploy();
      await expect(reverse.connect(reverseOp).updateReverse(
        1, ethers.utils.parseEther("1"), ethers.constants.AddressZero,
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
      await erc20A.mint(reverse.address, ethers.utils.parseEther("1"));
      await reverse.connect(reverseOp).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address);
      expect(await erc20A.balanceOf(otherAccount.address)).to.eq(ethers.utils.parseEther("0.9"));
      expect(await erc20A.balanceOf(reverse.address)).to.equal(ethers.utils.parseEther("0.1"));
    });

    it("should be reverted when not ADMIN role", async function () {
      const { reverse, otherAccount, erc20A } = await loadFixture(deployReverse);
      await expect(reverse.connect(otherAccount).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address))
        .to.revertedWith(`AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ethers.utils.id("ADMIN")}`);
    });
  });

  describe("pause", function () {
    it("should pause success", async function () {
      const { factory, reverse } = await loadFixture(deployReverse);
      await factory.pauseReverse(reverse.address);
      expect(await reverse.paused()).to.be.true;
    });

    it("should be reverted when not from factory", async function () {
      const { reverse, reverseOp } = await loadFixture(deployReverse);
      await expect(reverse.connect(reverseOp).pause()).to.revertedWith("only factory");
    });

    it("should be reverted when paused, redeemWithMark", async function () {
      const { factory, reverse, otherAccount, erc721A } = await loadFixture(deployReverse);
      await factory.pauseReverse(reverse.address);
      const mockCustomId = defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('mock-custom-id')]);
      await expect(reverse.connect(otherAccount).redeemWithMark(
        erc721A.address, 0, mockCustomId, 0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, updateReverse", async function () {
      const { factory, reverse, reverseOp } = await loadFixture(deployReverse);
      await factory.pauseReverse(reverse.address);
      await expect(reverse.connect(reverseOp).updateReverse(
        0, ethers.utils.parseEther("1"), ethers.constants.AddressZero,
        0, 0, zeroBytes32, zeroBytes32,
      )).to.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, grantOperator", async function () {
      const { factory, reverse, reverseOp, otherAccount } = await loadFixture(deployReverse);
      await factory.pauseReverse(reverse.address);
      await expect(reverse.connect(reverseOp).grantOperator(otherAccount.address))
        .to.revertedWith("Pausable: paused");
    });

    it("should be reverted when paused, withdraw", async function () {
      const { factory, reverse, reverseOp, otherAccount, erc20A } = await loadFixture(deployReverse);
      await factory.pauseReverse(reverse.address);
      await expect(reverse.connect(reverseOp).withdraw(erc20A.address, ethers.utils.parseEther("0.9"), otherAccount.address))
        .to.revertedWith("Pausable: paused");
    });
  });
});