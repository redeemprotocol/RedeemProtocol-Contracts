import { ethers } from "hardhat";
import { redeemMethod } from "./utils";

const zeroBytes32 = ethers.utils.formatBytes32String('');

const FORWARDER_ADDR = '';
const REVERSE_ADDR = '';
const METHOD: redeemMethod = redeemMethod.redeemWithMark;
const CONTRACT_ADDR = '';
const TOKEN_ID = 0;
const CUSTOM_ID = ethers.utils.formatBytes32String('');
const REDEEM_TOKEN = '';
const REDEEM_AMOUNT = ethers.utils.parseUnits("1", 6);

async function main() {
  const [ADMIN, ROOT_CREATOR, REDEEMER, PAYER] = await ethers.getSigners();
  const iface = new ethers.utils.Interface([
    "function redeemWithMark(address _contractAddr, uint256 _tokenId, bytes32 _customId, uint _deadline, uint8 _v, bytes32 _r, bytes32 _s)",
    "function redeemWithTransfer(address _contractAddr, uint256 _tokenId, bytes32 _customId, uint _deadline, uint8 _v, bytes32 _r, bytes32 _s)",
    "function redeemWithBurn(address _contractAddr, uint256 _tokenId, bytes32 _customId, uint _deadline, uint8 _v, bytes32 _r, bytes32 _s)",
  ]);
  const erc721 = await ethers.getContractFactory("ERC721");
  const e721 = erc721.attach(CONTRACT_ADDR);
  const forwarderFactory = await ethers.getContractFactory("MinimalForwarder");
  const forwarder = forwarderFactory.attach(FORWARDER_ADDR);

  let m: string;
  switch(METHOD) {
    case redeemMethod.redeemWithMark:
      m = "redeemWithMark";
      break;
    case redeemMethod.redeemWithTransfer:
      m = "redeemWithTransfer";
      await e721.connect(REDEEMER).approve(REVERSE_ADDR, TOKEN_ID);
      break;
    case redeemMethod.redeemWithBurn:
      m = "redeemWithBurn";
      await e721.connect(REDEEMER).approve(REVERSE_ADDR, TOKEN_ID);
      break;
  };
  await forwarder.connect(ADMIN).approve(REDEEM_TOKEN, REVERSE_ADDR, REDEEM_AMOUNT);
  const txData = iface.encodeFunctionData(m, [
    CONTRACT_ADDR,
    TOKEN_ID,
    CUSTOM_ID,
    0, 0, zeroBytes32, zeroBytes32,
  ]);

  const nonce = await forwarder.connect(ADMIN).getNonce(REDEEMER.address);
  const gas = 400000;
  const data = {
    domain: {
      name: 'MinimalForwarder',
      version: '0.0.1',
      chainId: 4,
      verifyingContract: forwarder.address,
    },
    message: {
      from: REDEEMER,
      to: REVERSE_ADDR,
      value: 0,
      gas: gas,
      nonce: nonce,
      data: txData,
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

  const sig = await REDEEMER._signTypedData(data.domain, data.types, data.message);
  const res = await forwarder.connect(PAYER).execute(
    {
        from: REDEEMER.address,
        to: REVERSE_ADDR,
        value: 0,
        gas: gas,
        nonce: nonce,
        data: txData,
    },
    sig,
  );

  console.log(res);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
