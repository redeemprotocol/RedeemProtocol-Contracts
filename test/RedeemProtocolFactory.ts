import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { MockContract } from "ethereum-waffle";
import { ethers, waffle, network } from "hardhat";
import RedeemProtocolReverse from "../artifacts/contracts/RedeemProtocolReverse.sol/RedeemProtocolReverse.json";
import { RedeemProtocolFactory } from "../typechain-types";
import { defaultAbiCoder } from "@ethersproject/abi";
const { deployMockContract, provider } = waffle;

describe("RedeemProtocolFactory", function() {
  async function deployFactory() {
    // Contracts are deployed using the first signer/account by default
    const [deployerOfContract] = provider.getWallets();
    const erc20 = require('../artifacts/contracts/interfaces/IERC20.sol/IERC20.json');
    const mockERC20 = await deployMockContract(deployerOfContract, erc20.abi);

    const [owner, otherAccount, otherAccount2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: mockERC20.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: mockERC20.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: mockERC20.address,
      }
    );

    return { factory, owner, otherAccount, otherAccount2 };
  }

  async function deployFactoryWithRole() {
    const [deployerOfContract] = provider.getWallets();
    const erc20 = require('../artifacts/contracts/interfaces/IERC20.sol/IERC20.json');
    const mockERC20A = await deployMockContract(deployerOfContract, erc20.abi);
    const mockERC20B = await deployMockContract(deployerOfContract, erc20.abi);
    const erc721 = require('../artifacts/contracts/interfaces/IERC721Ownable.sol/IERC721Ownable.json');
    const mockERC721A = await deployMockContract(deployerOfContract, erc721.abi);
    const mockERC721B = await deployMockContract(deployerOfContract, erc721.abi);


    const [admin, op, reverseOp, otherAccount] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: mockERC20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: mockERC20A.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: mockERC20A.address,
      }
    );
    await factory.grantRole(ethers.utils.id("OPERATOR"), op.address);
    await factory.grantRole(ethers.utils.id("REVERSE_OPERATOR"), reverseOp.address);

    return { factory, admin, op, reverseOp, otherAccount, mockERC20A, mockERC20B, mockERC721A, mockERC721B };
  }

  async function deployFactoryWithERC20Permit() {
    const [deployerOfContract] = provider.getWallets();
    const erc20Permit = require('../artifacts/contracts/interfaces/IERC20Permit.sol/IERC20Permit.json');
    const mockERC20Permit = await deployMockContract(deployerOfContract, erc20Permit.abi);
    const erc721 = require('../artifacts/contracts/interfaces/IERC721Ownable.sol/IERC721Ownable.json');
    const mockERC721 = await deployMockContract(deployerOfContract, erc721.abi);


    const [admin, op, reverseOp, otherAccount] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RedeemProtocolFactory");
    const factory = await Factory.deploy(
      {
        amount: ethers.utils.parseEther("0.1"),
        token: mockERC20Permit.address,
      },
      {
        amount: ethers.utils.parseEther("0.01"),
        token: mockERC20Permit.address,
      },
      {
        amount: ethers.utils.parseEther("0.001"),
        token: mockERC20Permit.address,
      }
    );
    await factory.grantRole(ethers.utils.id("OPERATOR"), op.address);
    await factory.grantRole(ethers.utils.id("REVERSE_OPERATOR"), reverseOp.address);

    return { factory, admin, op, reverseOp, otherAccount, mockERC20Permit, mockERC721 };
  }

  describe("Permission", function () {
    it("should has ADMIN role for owner", async function () {
      const { factory, owner } = await loadFixture(deployFactory);

      // Do NOT use UTF-8 strings that are not a DataHexstring
      // If needed, convert strings to bytes first:
      // utils.keccak256(utils.toUtf8Bytes("hello world"))
      // Or equivalently use the identity function:
      // utils.id("hello world")
      expect(await factory.hasRole(ethers.utils.id("ADMIN"), owner.address)).to.be.true;
    });

    it("should has OPERATOR role for owner", async function () {
      const { factory, owner } = await loadFixture(deployFactory);
      expect(await factory.hasRole(ethers.utils.id("OPERATOR"), owner.address)).to.be.true;
    });

    it("should has OPERATOR role admin for ADMIN", async function () {
      const { factory } = await loadFixture(deployFactory);
      expect(await factory.getRoleAdmin(ethers.utils.id("OPERATOR"))).to.equal(ethers.utils.id("ADMIN"));
    });

    it("should has REVERSE_OPERATOR role admin for OPERATOR", async function () {
      const { factory } = await loadFixture(deployFactory);
      expect(await factory.getRoleAdmin(ethers.utils.id("REVERSE_OPERATOR"))).to.equal(ethers.utils.id("OPERATOR"));
    });

    it("should not have ADMIN role for other account", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      expect(await factory.hasRole(ethers.utils.id("ADMIN"), otherAccount.address)).to.be.false;
    });

    it("should not have OPERATOR role for other account", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      expect(await factory.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.false;
    });

    it("should not have REVERSE_OPERATOR role at beginning", async function() {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      expect(await factory.hasRole(ethers.utils.id("REVERSE_OPERATOR"), otherAccount.address)).to.be.false;
    });

    it("should be able to grant OPERATOR role to other account from ADMIN", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      await factory.grantRole(ethers.utils.id("OPERATOR"), otherAccount.address);
      expect(await factory.hasRole(ethers.utils.id("OPERATOR"), otherAccount.address)).to.be.true;
    });

    it("should be able to grant REVERSE_OPERATOR role to other account from ADMIN", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactory);
      await factory.grantRole(ethers.utils.id("REVERSE_OPERATOR"), otherAccount.address);
      expect(await factory.hasRole(ethers.utils.id("REVERSE_OPERATOR"), otherAccount.address)).to.be.true;
    });

    it("should not be able to grant OPERATOR role to other account from non ADMIN", async function () {
      const { factory, otherAccount, otherAccount2 } = await loadFixture(deployFactory);
      await expect(factory.connect(otherAccount).grantRole(ethers.utils.id("OPERATOR"), otherAccount2.address)).to.be.revertedWith(
        "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42"
      );
    });

    it("should not be able to grant REVERSE_OPERATOR role to other account from non ADMIN", async function() {
      const { factory, otherAccount, otherAccount2 } = await loadFixture(deployFactory);
      await expect(factory.connect(otherAccount).grantRole(ethers.utils.id("REVERSE_OPERATOR"), otherAccount2.address)).to.be.revertedWith(
        "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c"
      );
    });
  });

  describe("createReverse", function () {
    function getReverseInitCode(
      address: string,
      updateFee: any,
      baseRedeemFee: any
    ) {
      const encoded = ethers.utils.defaultAbiCoder.encode(
        ['address', 'tuple(uint256,address)', 'tuple(uint256,address)'],
        [
          address,
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
      return ethers.utils.keccak256(`${RedeemProtocolReverse.bytecode}${encoded}`);
    }

    async function createReverse(
      factory: RedeemProtocolFactory,
      reverseOp: SignerWithAddress,
      tokenReceiver: string,
      mockERC20: MockContract,
      mockERC721: MockContract,
      method: BigNumberish,
    ) {
      const initCode = getReverseInitCode(
        reverseOp.address,
        {
          amount: ethers.utils.parseEther("0.01"),
          token: mockERC20.address
        },
        {
          amount: ethers.utils.parseEther("0.001"),
          token: mockERC20.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [reverseOp.address, provider.network.chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await mockERC721.mock.owner.returns(reverseOp.address);
      await mockERC20.mock.transferFrom.withArgs(reverseOp.address, factory.address, ethers.utils.parseEther("0.1")).returns(true);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        method, ethers.utils.parseEther("0.005"),
        [mockERC721.address], tokenReceiver,
      )).to.emit(factory, "ReverseCreated").withArgs(reverseOp.address, create2Address);
      

      expect(await factory.allReverses(0)).to.equal(create2Address);
      expect(await factory.allReversesLength()).to.equal(1);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', create2Address);
      expect(await reverse.factory()).to.equal(factory.address);
      expect(await reverse.hasRole(ethers.utils.id("ADMIN"), reverseOp.address)).to.be.true;
      expect(await reverse.hasRole(ethers.utils.id("OPERATOR_ROLE"), reverseOp.address)).to.be.true;
      expect(await reverse.getRoleAdmin(ethers.utils.id("OPERATOR_ROLE"))).to.equal(ethers.utils.id("ADMIN"));
      expect(await reverse.erc721(0)).to.equal(mockERC721.address);
      expect(await reverse.redeemAmount()).to.equal(ethers.utils.parseEther("0.005"));
      expect(await reverse.redeemMethod()).to.equal(method);
      expect(await reverse.tokenReceiver()).to.equal(tokenReceiver);

      // TODO: maybe we can shorten this test
      const updateFee = await reverse.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("0.01"));
      expect(updateFee.token).to.equal(mockERC20.address);
      const baseRedeemFee = await reverse.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("0.001"));
      expect(baseRedeemFee.token).to.equal(mockERC20.address);
    };

    it("should create successfully with mark", async () => {
      // NOTE: must place await
      const { factory, reverseOp, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await createReverse(factory, reverseOp, ethers.constants.AddressZero, mockERC20A, mockERC721A, 0);
    });

    it("should create successfully with transfer", async () => {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await createReverse(factory, reverseOp, otherAccount.address, mockERC20A, mockERC721A, 1);
    });

    it("should create successfully with burn", async () => {
      const { factory, reverseOp, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await createReverse(factory, reverseOp, ethers.constants.AddressZero, mockERC20A, mockERC721A, 2);
    });

    it("should create successfully with non REVERSE_OPERATOR when not approved only", async function () {
      const { factory, otherAccount, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await factory.flipApprovedOnly();
      await createReverse(factory, otherAccount, ethers.constants.AddressZero, mockERC20A, mockERC721A, 0);
    });

    it("should be reverted for non reverse operator", async function () {
      const { factory, op, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(op)["createReverse(uint8,uint256,address[],address)"](
        0, ethers.utils.parseEther("0.1"),
        [mockERC721A.address], ethers.constants.AddressZero,
      )).to.be.revertedWith("approved only");
    });

    it("should be reverted for transfer method and msg.sender is not ERC721 owner", async function () {
      const { factory, reverseOp, otherAccount, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await mockERC721A.mock.owner.returns(otherAccount.address);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        1, ethers.utils.parseEther("0.1"),
        [mockERC721A.address], ethers.constants.AddressZero,
      )).to.be.revertedWith("must be owner of ERC721");
    });

    it("should be reverted for burn method and msg.sender is not ERC721 owner", async function () {
      const { factory, reverseOp, otherAccount, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await mockERC721A.mock.owner.returns(otherAccount.address);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        2, ethers.utils.parseEther("0.1"),
        [mockERC721A.address], ethers.constants.AddressZero,
      )).to.be.revertedWith("must be owner of ERC721");
    });

    it("should be reverted for transfer method and tokenReceiver is zero address", async function () {
      const { factory, reverseOp, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await mockERC721A.mock.owner.returns(reverseOp.address);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        1, ethers.utils.parseEther("0.1"),
        [mockERC721A.address], ethers.constants.AddressZero,
      )).to.be.revertedWith("tokenReceiver must be set");
    });

    it("should create successfully with designate setup fee", async function () {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC20B, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await factory.setDesignateSetupFee(reverseOp.address, ethers.utils.parseEther("1"), mockERC20B.address);

      const initCode = getReverseInitCode(
        reverseOp.address,
        {
          amount: ethers.utils.parseEther("0.01"),
          token: mockERC20A.address
        },
        {
          amount: ethers.utils.parseEther("0.001"),
          token: mockERC20A.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [reverseOp.address, provider.network.chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await mockERC721A.mock.owner.returns(reverseOp.address);
      await mockERC20B.mock.transferFrom.withArgs(reverseOp.address, factory.address, ethers.utils.parseEther("1")).returns(true);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        1, ethers.utils.parseEther("0.005"),
        [mockERC721A.address], otherAccount.address,
      )).to.emit(factory, "ReverseCreated").withArgs(reverseOp.address, create2Address);
    });

    it("should create sucessfully with designate update fee", async function () {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC20B, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await factory.setDesignateUpdateFee(reverseOp.address, ethers.utils.parseEther("1"), mockERC20B.address);

      const initCode = getReverseInitCode(
        reverseOp.address,
        {
          amount: ethers.utils.parseEther("1"),
          token: mockERC20B.address
        },
        {
          amount: ethers.utils.parseEther("0.001"),
          token: mockERC20A.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [reverseOp.address, provider.network.chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await mockERC721A.mock.owner.returns(reverseOp.address);
      await mockERC20A.mock.transferFrom.withArgs(reverseOp.address, factory.address, ethers.utils.parseEther("0.1")).returns(true);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        1, ethers.utils.parseEther("0.005"),
        [mockERC721A.address], otherAccount.address,
      )).to.emit(factory, "ReverseCreated").withArgs(reverseOp.address, create2Address);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', create2Address);
      const updateFee = await reverse.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(updateFee.token).to.equal(mockERC20B.address);
    });

    it("should create sucessfully with designate base redeem fee", async function () {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC20B, mockERC721A } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(mockERC20B.address);
      await factory.setDesignateBaseRedeemFee(reverseOp.address, ethers.utils.parseEther("1"), mockERC20B.address);

      const initCode = getReverseInitCode(
        reverseOp.address,
        {
          amount: ethers.utils.parseEther("0.01"),
          token: mockERC20A.address
        },
        {
          amount: ethers.utils.parseEther("1"),
          token: mockERC20B.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [reverseOp.address, provider.network.chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await mockERC721A.mock.owner.returns(reverseOp.address);
      await mockERC20A.mock.transferFrom.withArgs(reverseOp.address, factory.address, ethers.utils.parseEther("0.1")).returns(true);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        1, ethers.utils.parseEther("0.005"),
        [mockERC721A.address], otherAccount.address,
      )).to.emit(factory, "ReverseCreated").withArgs(reverseOp.address, create2Address);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', create2Address);
      const baseRedeemFee = await reverse.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(baseRedeemFee.token).to.equal(mockERC20B.address);
    });

    it("should create sucessfully with permit", async function () {
      const { factory, reverseOp, otherAccount, mockERC20Permit, mockERC721 } = await loadFixture(deployFactoryWithERC20Permit);

      const initCode = getReverseInitCode(
        reverseOp.address,
        {
          amount: ethers.utils.parseEther("0.01"),
          token: mockERC20Permit.address
        },
        {
          amount: ethers.utils.parseEther("0.001"),
          token: mockERC20Permit.address
        }
      );
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [reverseOp.address, provider.network.chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      const mockDeadline = 1000000;
      const mockV = 99;
      const mockR = ethers.utils.keccak256(defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('r')]));
      const mockS = ethers.utils.keccak256(defaultAbiCoder.encode(['bytes32'], [ethers.utils.formatBytes32String('s')]));
      await mockERC721.mock.owner.returns(reverseOp.address);
      await mockERC20Permit.mock.permit.withArgs(
        reverseOp.address, factory.address, ethers.utils.parseEther("0.1"), mockDeadline, mockV, mockR, mockS,
      ).returns();
      await mockERC20Permit.mock.transferFrom.withArgs(reverseOp.address, factory.address, ethers.utils.parseEther("0.1")).returns(true);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address,uint256,uint8,bytes32,bytes32)"](
        1, ethers.utils.parseEther("0.005"),
        [mockERC721.address], otherAccount.address, mockDeadline, mockV, mockR, mockS,
      )).to.emit(factory, "ReverseCreated").withArgs(reverseOp.address, create2Address);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', create2Address);
      const baseRedeemFee = await reverse.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("0.001"));
      expect(baseRedeemFee.token).to.equal(mockERC20Permit.address);
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
      const { factory, op, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).setDefaultSetupFee(ethers.utils.parseEther("1"), mockERC20B.address);

      const deafultSetupFee = await factory.defaultSetupFee();
      expect(deafultSetupFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(deafultSetupFee.token).to.equal(mockERC20B.address);
    });

    it("defaultSetupFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .setDefaultSetupFee(ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("defaultUpdateFee success", async function () {
      const { factory, op, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).setDefaultUpdateFee(ethers.utils.parseEther("1"), mockERC20B.address);

      const defaultUpdateFee = await factory.defaultUpdateFee();
      expect(defaultUpdateFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(defaultUpdateFee.token).to.equal(mockERC20B.address);
    });

    it("defaultUpdateFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .setDefaultUpdateFee(ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("defaultBaseRedeemFee success", async function () {
      const { factory, op, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(mockERC20B.address);
      await factory.connect(op).setDefaultBaseRedeemFee(ethers.utils.parseEther("1"), mockERC20B.address);

      const defaultBaseRedeemFee = await factory.defaultBaseRedeemFee();
      expect(defaultBaseRedeemFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(defaultBaseRedeemFee.token).to.equal(mockERC20B.address);
    });

    it("defaultBaseRedeemFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(mockERC20B.address);
      await expect(factory.connect(otherAccount)
        .setDefaultBaseRedeemFee(ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("defaultBaseRedeemFee reverted when token is not valid", async function () {
      const { factory, op, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(op)
        .setDefaultBaseRedeemFee(ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("token is not valid");
    });
  });

  describe("set designate config", function () {
    it("setDesignateSetupFee success", async function () {
      const { factory, op, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).setDesignateSetupFee(otherAccount.address, ethers.utils.parseEther("1"), mockERC20B.address);

      const designateSetupFee = await factory.designateSetupFee(otherAccount.address);
      expect(designateSetupFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(designateSetupFee.token).to.equal(mockERC20B.address);
    });

    it("setDesignateSetupFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .setDesignateSetupFee(otherAccount.address, ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setDesignateUpdateFee success", async function () {
      const { factory, op, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).setDesignateUpdateFee(otherAccount.address, ethers.utils.parseEther("1"), mockERC20B.address);

      const designateUpdateFee = await factory.designateUpdateFee(otherAccount.address);
      expect(designateUpdateFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(designateUpdateFee.token).to.equal(mockERC20B.address);
    });

    it("setDesignateUpdateFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .setDesignateUpdateFee(otherAccount.address, ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setDesignateBaseRedeemFee success", async function () {
      const { factory, op, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(mockERC20B.address);
      await factory.connect(op).setDesignateBaseRedeemFee(otherAccount.address, ethers.utils.parseEther("1"), mockERC20B.address);

      const designateBaseRedeemFee = await factory.designateBaseRedeemFee(otherAccount.address);
      expect(designateBaseRedeemFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(designateBaseRedeemFee.token).to.equal(mockERC20B.address);
    });

    it("setDesignateBaseRedeemFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.flipValidRedeemToken(mockERC20B.address);
      await expect(factory.connect(otherAccount)
        .setDesignateBaseRedeemFee(otherAccount.address, ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setDesignateBaseRedeemFee reverted when token is not valid", async function () {
      const { factory, op, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(op)
        .setDesignateBaseRedeemFee(otherAccount.address, ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("token is not valid");
    });
  });

  describe("flipValidRedeemToken", function () {
    it("should be true", async function () {
      const { factory, op, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await factory.connect(op).flipValidRedeemToken(mockERC20B.address);
      const isValid = await factory.validRedeemToken(mockERC20B.address);
      expect(isValid).to.be.true;
    });

    it("should be reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, mockERC20B } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount)
        .flipValidRedeemToken(mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("should be true flip twice", async function () {
      const { factory, op, mockERC20B } = await loadFixture(deployFactoryWithRole);

      await factory.connect(op).flipValidRedeemToken(mockERC20B.address);
      const first = await factory.validRedeemToken(mockERC20B.address);
      expect(first).to.be.true;

      await factory.connect(op).flipValidRedeemToken(mockERC20B.address);
      const second = await factory.validRedeemToken(mockERC20B.address);
      expect(second).to.be.false;
    });
  });

  describe("set reverse config", function () {
    async function createReverse(
      factory: RedeemProtocolFactory,
      reverseOp: SignerWithAddress,
      mockERC20: MockContract,
      mockERC721: MockContract,
    ) {
      const encoded = ethers.utils.defaultAbiCoder.encode(
        ['address', 'tuple(uint256,address)', 'tuple(uint256,address)'],
        [
          reverseOp.address,
          [
            ethers.utils.parseEther("0.01"),
            mockERC20.address
          ],
          [
            ethers.utils.parseEther("0.001"),
            mockERC20.address
          ]
        ]
      ).slice(2);
      const initCode = ethers.utils.keccak256(`${RedeemProtocolReverse.bytecode}${encoded}`);
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [reverseOp.address, provider.network.chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await mockERC721.mock.owner.returns(reverseOp.address);
      await mockERC20.mock.transferFrom.withArgs(reverseOp.address, factory.address, ethers.utils.parseEther("0.1")).returns(true);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        0, ethers.utils.parseEther("0.005"),
        [mockERC721.address], ethers.constants.AddressZero,
      )).to.emit(factory, "ReverseCreated").withArgs(reverseOp.address, create2Address);

      expect(await factory.allReverses(0)).to.equal(create2Address);
      expect(await factory.allReversesLength()).to.equal(1);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', create2Address);
      expect(await reverse.factory()).to.equal(factory.address);
      expect(await reverse.hasRole(ethers.utils.id("ADMIN"), reverseOp.address)).to.be.true;
      expect(await reverse.hasRole(ethers.utils.id("OPERATOR_ROLE"), reverseOp.address)).to.be.true;
      expect(await reverse.getRoleAdmin(ethers.utils.id("OPERATOR_ROLE"))).to.equal(ethers.utils.id("ADMIN"));
      expect(await reverse.erc721(0)).to.equal(mockERC721.address);
      expect(await reverse.redeemAmount()).to.equal(ethers.utils.parseEther("0.005"));
      expect(await reverse.redeemMethod()).to.equal(0);
      expect(await reverse.tokenReceiver()).to.equal(ethers.constants.AddressZero);

      // TODO: maybe we can shorten this test
      const updateFee = await reverse.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("0.01"));
      expect(updateFee.token).to.equal(mockERC20.address);
      const baseRedeemFee = await reverse.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("0.001"));
      expect(baseRedeemFee.token).to.equal(mockERC20.address);

      return create2Address;
    };

    it("setUpdateFee success", async function () {
      const { factory, op, reverseOp, mockERC20A, mockERC20B, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await factory.connect(op).setUpdateFee(reverseAddr, ethers.utils.parseEther("1"), mockERC20B.address);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', reverseAddr);
      const updateFee = await reverse.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(updateFee.token).to.equal(mockERC20B.address);
    });

    it("setUpdateFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, reverseOp, mockERC20A, mockERC20B, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await expect(factory.connect(otherAccount)
        .setUpdateFee(reverseAddr, ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setBaseRedeemFee success", async function () {
      const { factory, op, reverseOp, mockERC20A, mockERC20B, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await factory.connect(op).setBaseRedeemFee(reverseAddr, ethers.utils.parseEther("1"), mockERC20B.address);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', reverseAddr);
      const baseRedeemFee = await reverse.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("1"));
      expect(baseRedeemFee.token).to.equal(mockERC20B.address);
    });

    it("setBaseRedeemFee reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, reverseOp, mockERC20A, mockERC20B, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await expect(factory.connect(otherAccount)
        .setBaseRedeemFee(reverseAddr, ethers.utils.parseEther("1"), mockERC20B.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });

    it("setRedeemAmount success", async function () {
      const { factory, op, reverseOp, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await factory.connect(op).setRedeemAmount(reverseAddr, ethers.utils.parseEther("1"));

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', reverseAddr);
      expect(await reverse.redeemAmount()).to.equal(ethers.utils.parseEther("1"));
    });

    it("setRedeemAmount reverted when not OPERATOR role", async function () {
      const { factory, otherAccount, reverseOp, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await expect(factory.connect(otherAccount)
        .setRedeemAmount(reverseAddr, ethers.utils.parseEther("1")))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c");
    });
  });

  describe("admin methods", function () {
    async function createReverse(
      factory: RedeemProtocolFactory,
      reverseOp: SignerWithAddress,
      mockERC20: MockContract,
      mockERC721: MockContract,
    ) {
      const encoded = ethers.utils.defaultAbiCoder.encode(
        ['address', 'tuple(uint256,address)', 'tuple(uint256,address)'],
        [
          reverseOp.address,
          [
            ethers.utils.parseEther("0.01"),
            mockERC20.address
          ],
          [
            ethers.utils.parseEther("0.001"),
            mockERC20.address
          ]
        ]
      ).slice(2);
      const initCode = ethers.utils.keccak256(`${RedeemProtocolReverse.bytecode}${encoded}`);
      const salt = defaultAbiCoder.encode(['address', 'uint256', 'uint256'], [reverseOp.address, provider.network.chainId, 0]);
      const create2Address = ethers.utils.getCreate2Address(
        factory.address,
        ethers.utils.keccak256(salt),
        initCode,
      )

      await mockERC721.mock.owner.returns(reverseOp.address);
      await mockERC20.mock.transferFrom.withArgs(reverseOp.address, factory.address, ethers.utils.parseEther("0.1")).returns(true);
      await expect(factory.connect(reverseOp)["createReverse(uint8,uint256,address[],address)"](
        0, ethers.utils.parseEther("0.005"),
        [mockERC721.address], ethers.constants.AddressZero,
      )).to.emit(factory, "ReverseCreated").withArgs(reverseOp.address, create2Address);

      expect(await factory.allReverses(0)).to.equal(create2Address);
      expect(await factory.allReversesLength()).to.equal(1);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', create2Address);
      expect(await reverse.factory()).to.equal(factory.address);
      expect(await reverse.hasRole(ethers.utils.id("ADMIN"), reverseOp.address)).to.be.true;
      expect(await reverse.hasRole(ethers.utils.id("OPERATOR_ROLE"), reverseOp.address)).to.be.true;
      expect(await reverse.getRoleAdmin(ethers.utils.id("OPERATOR_ROLE"))).to.equal(ethers.utils.id("ADMIN"));
      expect(await reverse.erc721(0)).to.equal(mockERC721.address);
      expect(await reverse.redeemAmount()).to.equal(ethers.utils.parseEther("0.005"));
      expect(await reverse.redeemMethod()).to.equal(0);
      expect(await reverse.tokenReceiver()).to.equal(ethers.constants.AddressZero);

      // TODO: maybe we can shorten this test
      const updateFee = await reverse.updateFee();
      expect(updateFee.amount).to.equal(ethers.utils.parseEther("0.01"));
      expect(updateFee.token).to.equal(mockERC20.address);
      const baseRedeemFee = await reverse.baseRedeemFee();
      expect(baseRedeemFee.amount).to.equal(ethers.utils.parseEther("0.001"));
      expect(baseRedeemFee.token).to.equal(mockERC20.address);

      return create2Address;
    };

    it("should transferAdmin success", async function () {
      const { factory, admin, otherAccount } = await loadFixture(deployFactoryWithRole);
      await factory.connect(admin).transferAdmin(otherAccount.address);

      expect(await factory.hasRole(ethers.utils.id("ADMIN"), admin.address)).to.be.false;
      expect(await factory.hasRole(ethers.utils.id("ADMIN"), otherAccount.address)).to.be.true;
    });

    it("transferAdmin should be reverted when not ADMIN role", async function () {
      const { factory, otherAccount } = await loadFixture(deployFactoryWithRole);
      await expect(factory.connect(otherAccount).transferAdmin(otherAccount.address))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42");
    });

    it("pauseReverse should success", async function () {
      const { factory, reverseOp, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await factory.pauseReverse(reverseAddr);

      const reverse = await ethers.getContractAt('RedeemProtocolReverse', reverseAddr);
      expect(await reverse.paused()).to.be.true;
    });

    it("pauseReverse should be reverted when not ADMIN role", async function () {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await expect(factory.connect(otherAccount).pauseReverse(reverseAddr))
        .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42");
    });

    it("withdraw should success", async function () {
      const { factory, otherAccount, mockERC20A } = await loadFixture(deployFactoryWithRole);
      await mockERC20A.mock.balanceOf.returns(ethers.utils.parseEther("1"));
      await mockERC20A.mock.transferFrom.withArgs(factory.address, otherAccount.address, ethers.utils.parseEther("1")).returns(true);
      await factory.withdraw(mockERC20A.address, ethers.utils.parseEther("1"), otherAccount.address);
    });

    it("withdraw should be reverted when not enougn balance", async function () {
      const { factory, otherAccount, mockERC20A } = await loadFixture(deployFactoryWithRole);
      await mockERC20A.mock.balanceOf.returns(ethers.utils.parseEther("0.1"));
      await expect(factory.withdraw(mockERC20A.address, ethers.utils.parseEther("1"), otherAccount.address))
          .to.be.revertedWith("not enough balance");
    });

    it("withdraw should be reverted when not ADMIN role", async function () {
      const { factory, otherAccount, mockERC20A } = await loadFixture(deployFactoryWithRole);
      await mockERC20A.mock.balanceOf.returns(ethers.utils.parseEther("1"));
      await expect(factory.connect(otherAccount).withdraw(mockERC20A.address, ethers.utils.parseEther("1"), otherAccount.address))
          .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42");
    });

    it("withdrawReverse should success", async function () {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await mockERC20A.mock.balanceOf.returns(ethers.utils.parseEther("1"));
      await mockERC20A.mock.transferFrom.withArgs(reverseAddr, otherAccount.address, ethers.utils.parseEther("1")).returns(true);
      await factory.withdrawReverse(reverseAddr, mockERC20A.address, ethers.utils.parseEther("1"), otherAccount.address);
    });

    it("withdrawReverse should be reverted when not enougn balance", async function () {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);

      // lockedBalance index is 3
      const slotIndex = 3;
      const slot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address', 'uint'], [mockERC20A.address, slotIndex])
      );
      const value = ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers.utils.parseEther("1")]);
      await network.provider.send("hardhat_setStorageAt", [ reverseAddr, slot, value]);

      await mockERC20A.mock.balanceOf.returns(ethers.utils.parseEther("1"));
      await expect(factory.withdrawReverse(reverseAddr, mockERC20A.address, ethers.utils.parseEther("0.001"), otherAccount.address))
          .to.be.revertedWith("wrong balance");
    });

    it("withdrawReverse should be reverted when not ADMIN role", async function () {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await mockERC20A.mock.balanceOf.returns(ethers.utils.parseEther("1"));
      await expect(factory.connect(otherAccount).withdrawReverse(reverseAddr, mockERC20A.address, ethers.utils.parseEther("1"), otherAccount.address))
          .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42");
    });

    it("depositReverse should success", async function () {
      const { factory, admin, reverseOp, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await mockERC20A.mock.transferFrom.withArgs(admin.address, reverseAddr, ethers.utils.parseEther("1")).returns(true);
      await factory.depositReverse(reverseAddr, mockERC20A.address, ethers.utils.parseEther("1"));

      const reverse = ethers.getContractAt("RedeemProtocolReverse", reverseAddr);
      const balance = await (await reverse).lockedBalance(mockERC20A.address);
      expect(balance).to.equal(ethers.utils.parseEther("1"));
    });

    it("depositReverse should be reverted when not ADMIN role", async function () {
      const { factory, reverseOp, otherAccount, mockERC20A, mockERC721A } = await loadFixture(deployFactoryWithRole);
      const reverseAddr = await createReverse(factory, reverseOp, mockERC20A, mockERC721A);
      await expect(factory.connect(otherAccount).depositReverse(reverseAddr, mockERC20A.address, ethers.utils.parseEther("1")))
          .to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42");
    });
  });
});