require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    testnet: {
      url: process.env.PROVENANCE_RPC_URL || "https://rpc.test.provenance.io",
      chainId: parseInt(process.env.PROVENANCE_CHAIN_ID || "pio-testnet-1"),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    mainnet: {
      url: process.env.PROVENANCE_RPC_URL || "https://rpc.provenance.io",
      chainId: parseInt(process.env.PROVENANCE_CHAIN_ID || "pio-mainnet-1"),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  }
};
