import { ethers } from "hardhat";
import { redeemMethod } from "./utils";

const zeroBytes32 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));

const FACTORY_ADDR = '';
const METHOD = redeemMethod.redeemWithMark;
const REDEEM_AMOUNT = ethers.utils.parseUnits("1", 6);
const TOKEN_RECEIVER = ethers.constants.AddressZero;
const FORWARDER = ethers.constants.AddressZero;

async function main() {
  const [ADMIN, ROOT_CREATOR, REDEEMER, PAYER] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("RedeemProtocolFactory");
  const f = factory.attach(FACTORY_ADDR);
  const reverse = await f.connect(ROOT_CREATOR).createRealm(
    METHOD, REDEEM_AMOUNT, TOKEN_RECEIVER, FORWARDER,
    0, 0, zeroBytes32, zeroBytes32,
  );
  console.log("Hash: ", reverse.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
