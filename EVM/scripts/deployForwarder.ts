import { ethers } from "hardhat";


async function main() {
  const [ADMIN, ROOT_CREATOR, REDEEMER, PAYER] = await ethers.getSigners();
  
  const factory = await ethers.getContractFactory("MinimalForwarder");
  const forwarder = await factory.connect(ADMIN).deploy();
  await forwarder.deployed();
  console.log(`Forwarder address: ${forwarder.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
