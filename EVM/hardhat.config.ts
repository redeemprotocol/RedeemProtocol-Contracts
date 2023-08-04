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
  `0x${process.env.CLIENT_OPERATOR}`,
  `0x${process.env.EOA}`,
  `0x${process.env.OPERATOR}`
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
    eth: {
      url: process.env.ETH_PROVIDER_URL,
      accounts: accounts
    },
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
    },
    tt: {
      url: process.env.TT_PROVIDER_URL,
      accounts: accounts
    },
    tttest: {
      url: process.env.TTTEST_PROVIDER_URL,
      accounts: accounts
    }
  }
};

export default config;