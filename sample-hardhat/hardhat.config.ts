import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";   // ← toolbox 플러그인
import "hardhat-gas-reporter";               // (선택) 가스 리포터 명시
import "dotenv/config";                      // .env 로드


const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",


  networks: {
    kaia: {
      url: "https://public-en-kairos.node.kaia.io",
      chainId: 1001,
      accounts: [process.env.PRIVATE_KEY], 
    }
  },

  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: { timeout: 40000 },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
