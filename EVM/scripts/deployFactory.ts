import { ethers } from "hardhat";

async function main() {
  const [ADMIN, ROOT_CREATOR, REDEEMER, PAYER] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("RedeemProtocolFactory");
  const f = await factory.connect(ADMIN).deploy(
    {
      amount: ethers.utils.parseUnits("10", 6), // USDC decimals = 6
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on eth mainnet
    },
    {
      amount: ethers.utils.parseUnits("5", 6), // USDC decimals = 6
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on eth mainnet
    },
    {
      amount: ethers.utils.parseUnits("1", 6), // USDC decimals = 6
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on eth mainnet
    }
  );

  await f.deployed();
  console.log(`Factory address: ${f.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
