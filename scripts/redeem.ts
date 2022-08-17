import { ethers } from "hardhat";
import { redeemMethod } from "./utils";

const zeroBytes32 = ethers.utils.formatBytes32String('');

const REVERSE_ADDR = '';
const METHOD: redeemMethod = redeemMethod.redeemWithMark;
const CONTRACT_ADDR = '';
const TOKEN_ID = 0;
const CUSTOM_ID = ethers.utils.formatBytes32String('');
const REDEEM_TOKEN = '';
const REDEEM_AMOUNT = ethers.utils.parseUnits("1", 6);

async function main() {
  const [ADMIN, ROOT_CREATOR, REDEEMER, PAYER] = await ethers.getSigners();
  
  const reverse = await ethers.getContractFactory("RedeemProtocolReverse");
  const r = reverse.attach(REVERSE_ADDR);
  const erc721 = await ethers.getContractFactory("ERC721");
  const e721 = erc721.attach(CONTRACT_ADDR);
  const erc20 = await ethers.getContractFactory("ERC20");
  const e20 = erc20.attach(REDEEM_TOKEN);

  let fn: any;
  switch(METHOD) {
    case redeemMethod.redeemWithMark:
      fn = r.connect(REDEEMER).redeemWithMark;
      break;
    case redeemMethod.redeemWithTransfer:
      fn = r.connect(REDEEMER).redeemWithTransfer;
      await e721.connect(REDEEMER).approve(REVERSE_ADDR, TOKEN_ID);
      break;
    case redeemMethod.redeemWithBurn:
      fn = r.connect(REDEEMER).redeemWithBurn;
      await e721.connect(REDEEMER).approve(REVERSE_ADDR, TOKEN_ID);
      break;
  };
  await e20.connect(REDEEMER).approve(REVERSE_ADDR, REDEEM_AMOUNT);

  await fn(
    CONTRACT_ADDR,
    TOKEN_ID,
    CUSTOM_ID,
    0, 0, zeroBytes32, zeroBytes32,
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
