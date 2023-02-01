import { ethers } from "hardhat";

async function main() {
  const [ADMIN, ROOT_CREATOR, REDEEMER, PAYER] = await ethers.getSigners();
  const f = await ethers.getContractAt("CynicalFactory", "");

  await f.connect(ADMIN).grantRole(ethers.utils.id("ROOT_CREATOR"), '');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
