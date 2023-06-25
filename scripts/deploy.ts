import { ethers } from "hardhat";

async function main() {
 
  const SUSHISWAP = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
  const LPs = "DEPENDS_ON_THE_POOL"
  const MASTERCHEF = "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd";
  const MASTERCHEFV2 = "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d";

  const SushiChefWallet = await ethers.getContractFactory("SushiChefWallet");
  const sushiChefWallet = await SushiChefWallet.deploy(SUSHISWAP, LPs, MASTERCHEF, MASTERCHEFV2);

  console.log(`SushiChefWallet deployed to ${sushiChefWallet.getAddress()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
