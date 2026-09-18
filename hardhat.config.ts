import type { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-ethers"
import "@nomicfoundation/hardhat-chai-matchers"
import "@typechain/hardhat"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY!] : [],
      chainId: 137,
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://polygon-amoy.drpc.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY!] : [],
      chainId: 80002,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
}

export default config
