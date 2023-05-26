import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import dotenv from 'dotenv';
export * from "./tasks/tasks";

dotenv.config();

const accounts = [
  `0x${process.env.REDEEM_PROTOCOL_OPERATOR}`,
  `0x${process.env.REDEEM_SYSTEM_OPERATOR}`,
  `0x${process.env.CLIENT_OPERATOR}`
]

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    polygon_mumbai: {
      url: process.env.MUMBAI_PROVIDER_URL,
      accounts: accounts
    },
    goerli: {
      url: process.env.GOERLI_PROVIDER_URL,
      accounts: accounts
    },
    polygon: {
      url: process.env.POLYGON_PROVIDER_URL,
      accounts: accounts
    }
  }
};

export default config;