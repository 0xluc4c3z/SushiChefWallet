import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import dotenv from "dotenv";

dotenv.config();


const config: HardhatUserConfig = {
  networks: {
    hardhat: {},
    //ethereum: {
      //url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_APY_KEY}`,
      //accounts: [`0x${process.env.PRIVATE_KEY}`]
    //}
  },
  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ]
    
  },
  gasReporter: {
    enabled: true,
  }
};

export default config;


