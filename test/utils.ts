import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/dist/src/signer-with-address";
import {
  MockERC20,
  MockERC20__factory as MockERC20Factory,
  WETH,
  WETH__factory as WethFactory,
  UniswapV2Factory,
  UniswapV2Factory__factory as UniswapV2FactoryFactory,
  UniswapV2Router02,
  UniswapV2Router02__factory as UniswapV2Router02Factory,
  SushiToken,
  SushiToken__factory as SushiTokenFactory,
  RewarderMock,
  RewarderMock__factory as RewarderMockFactory,
  MasterChef,
  MasterChef__factory as MasterChefFactory,
  MasterChefV2,
  MasterChefV2__factory as MasterChefV2Factory,
  SushiChefWallet,
  SushiChefWallet__factory as SushiChefWalletFactory
} from "../typechain-types";

export type Address = string;

export type TestSigners = {
  deployer: SignerWithAddress;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
}

export const getSigners = async (): Promise<TestSigners> => {
  const [deployer, account0, account1, account2] = await ethers.getSigners();
  return {
    deployer,
    account0,
    account1,
    account2
  }
}

export const deployErc20 = async (deployer?: SignerWithAddress, name?: string, symbol?: string, decimals?: number, recipient?: Address): Promise<MockERC20> => {
  const factory = new MockERC20Factory(deployer || (await getSigners()).deployer);

  return factory.deploy(name!, symbol!, decimals!, recipient!);
} 

export const deployWeth = async (deployer?: SignerWithAddress): Promise<WETH> => {
  const factory = new WethFactory(deployer || (await getSigners()).deployer);

  return factory.deploy();
}

export const deployUniswapV2Factory = async (deployer?: SignerWithAddress): Promise<UniswapV2Factory> => {
  const factory = new UniswapV2FactoryFactory(deployer || (await getSigners()).deployer);

  return factory.deploy(deployer || (await getSigners()).deployer);
}

export const deployUniswapV2Router02 = async (deployer?: SignerWithAddress, uniV2Factory?: Address, weth?: Address): Promise<UniswapV2Router02> => {
  let factory = new UniswapV2Router02Factory(deployer || (await getSigners()).deployer);
  
  return factory.deploy(uniV2Factory!, weth!);
}

export const deploySushiToken = async (deployer?: SignerWithAddress): Promise<SushiToken> => {
  let factory = new SushiTokenFactory(deployer || (await getSigners()).deployer);

  return factory.deploy();
}

export const deployRewarderMock = async (deployer?: SignerWithAddress, rewardMultiplier?: number, rewardToken?: Address, masterChefV2?: Address): Promise<RewarderMock> => {
  let factory = new RewarderMockFactory(deployer || (await getSigners()).deployer);

  return factory.deploy(rewardMultiplier!, rewardToken!, masterChefV2!);
}

export const deployMasterchef = async (deployer?: SignerWithAddress, sushiToken?: Address, sushiPerBlock?: number, startBlock?: number, bonusEndBlock?: number): Promise<MasterChef> => {
  let factory = new MasterChefFactory(deployer || (await getSigners()).deployer);

  return factory.deploy(sushiToken!, deployer!.address, sushiPerBlock!, startBlock!, bonusEndBlock!)
}

export const deployMasterchefV2 = async (deployer?: SignerWithAddress, masterChef?: Address, sushiToken?: Address, masterPid?: number): Promise<MasterChefV2> => {
  let factory = new MasterChefV2Factory(deployer || (await getSigners()).deployer);

  return factory.deploy(masterChef!, sushiToken!, masterPid!);
}

export const deploySushiChefWallet= async (deployer?: SignerWithAddress, sushiSwap?: Address, lps?: Address, masterChef?: Address, masterChefV2?: Address): Promise<SushiChefWallet> => {
  let factory = new SushiChefWalletFactory(deployer || (await getSigners()).deployer);

  return factory.deploy(sushiSwap!, lps!, masterChef!, masterChefV2!);
}
