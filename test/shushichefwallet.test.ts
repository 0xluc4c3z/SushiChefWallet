import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/dist/src/signer-with-address";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { MaxUint256 } from "ethers"
import { MockERC20, WETH, UniswapV2Factory, UniswapV2Router02, UniswapV2ERC20, SushiToken, MasterChef, MasterChefV2, SushiChefWallet, RewarderMock } from "../typechain-types";
import { deployErc20, deployWeth, deployUniswapV2Factory, deployUniswapV2Router02, deploySushiToken, deployMasterchef, deployMasterchefV2, deploySushiChefWallet, deployRewarderMock } from "./utils";
import { ZeroAddress } from "ethers";

describe("SushiChefWallet", function () {
  let deployer: SignerWithAddress;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;

  // sushiswap
  let token0: MockERC20;
  let token1: MockERC20;
  let weth: WETH;
  let uniswapV2Factory: UniswapV2Factory;
  let uniswapV2Router02: UniswapV2Router02;
  let lpsContract: UniswapV2ERC20;

  // masterchef
  let sushiToken: SushiToken;
  let masterChef: MasterChef;
  let dummyToken: MockERC20;  
  let masterChefV2: MasterChefV2;
  let rewardToken: MockERC20;
  let rewarder: RewarderMock;
  
  // protocol
  let sushiChefWallet: SushiChefWallet;

  const NAME: string = "TestToken";
  const SYMBOL: string = "TT";
  const DECIMALS: number = 18;

  const SUSHI_PER_BLOCK: number = 100;
  const START_BLOCK: number = 100;
  const BONUS_END_BLOCK: number = 20000;

  beforeEach(async function () {
    [deployer, account0, account1] = await ethers.getSigners();

    // sushiswap
    token0 = await deployErc20(deployer, NAME, SYMBOL, DECIMALS, deployer.address);
    token1 = await deployErc20(deployer, NAME, SYMBOL, DECIMALS, deployer.address);
    await token0.connect(deployer).transfer(account0.address, 5000);
    await token1.connect(deployer).transfer(account0.address, 5000);

    weth = await deployWeth(deployer);
    
    uniswapV2Factory = await deployUniswapV2Factory(deployer)
    uniswapV2Router02 = await deployUniswapV2Router02(deployer, await uniswapV2Factory.getAddress(), await weth.getAddress());
    
    // masterchef
    sushiToken = await deploySushiToken();
    masterChef = await deployMasterchef(deployer, await sushiToken.getAddress(), SUSHI_PER_BLOCK, START_BLOCK, BONUS_END_BLOCK);
    await sushiToken.connect(deployer).transferOwnership(masterChef.getAddress()); // 1-
    
    dummyToken = await deployErc20(deployer, NAME, SYMBOL, DECIMALS, deployer.address);
    
    await masterChef.connect(deployer).add(100, dummyToken.getAddress(), true); // 3- 
    masterChefV2 = await deployMasterchefV2(deployer, await masterChef.getAddress(), await sushiToken.getAddress(), 0);

    await dummyToken.connect(deployer).approve(masterChefV2.getAddress(), 1_000_000_000_000_000);
    await masterChefV2.connect(deployer).init(dummyToken.getAddress());

    rewardToken = await deployErc20(deployer, NAME, SYMBOL, DECIMALS, deployer.address);
    rewarder = await deployRewarderMock(deployer, 10, await rewardToken.getAddress(), await masterChefV2.getAddress());
    await rewardToken.connect(deployer).transfer(rewarder.getAddress(), 1_000_000_000_000_000);

    // tests
    await token0.connect(deployer).transfer(account1.address, 2500);
    // await token1.connect(deployer).transfer(account1.address, 5000);
  });

  it('depositLiquidity: addLiquidity sushiswap and deposit masterchefv1', async () => {
    const AMOUNT: number = 5000;
    // this is a function added with the objective of using it for testing in the hardhat network.
    const pairAddress: string = await uniswapV2Router02.viewAddress(token0.getAddress(), token1.getAddress());

    // configuration
    lpsContract = await ethers.getContractAt("UniswapV2ERC20", pairAddress);
    sushiChefWallet = await deploySushiChefWallet(account0, await uniswapV2Router02.getAddress(), await lpsContract.getAddress(), await masterChef.getAddress(), await masterChefV2.getAddress());
    await masterChef.connect(deployer).add(100, lpsContract.getAddress(), true);
    expect(await masterChef.connect(deployer).poolLength()).to.be.eq(2); // se espera que sea 2

    // sushiswap and masterchefv1
    await token0.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);
    await token1.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);
    
    await sushiChefWallet.connect(account0).depositLiquidity(
      token0.getAddress(), 
      token1.getAddress(), 
      AMOUNT, AMOUNT, 
      0, 0, 
      MaxUint256, 
      1, 1
    );
    
    // Math.sqrt(5000 * 5000) - 1000 = 4000 
    let lpDeposit: number = Number((await masterChef.userInfo(1, sushiChefWallet.getAddress())).amount);
    expect(lpDeposit).to.be.eq(4000);
  });

  it('depositLiquidity: addLiquidity sushiswap and deposit masterchefv2', async () => {
    const AMOUNT: number = 5000;
    const pairAddress: string = await uniswapV2Router02.viewAddress(token0.getAddress(), token1.getAddress());

    // configuration 
    lpsContract = await ethers.getContractAt("UniswapV2ERC20", pairAddress);    
    sushiChefWallet = await deploySushiChefWallet(account0, await uniswapV2Router02.getAddress(), await lpsContract.getAddress(), await masterChef.getAddress(), await masterChefV2.getAddress());                  
    await masterChefV2.connect(deployer).add(10, lpsContract.getAddress(), rewarder.getAddress()); 
    expect(await masterChefV2.connect(deployer).poolLength()).to.be.eq(1); // se espera que sea 1

    // sushiswap and masterchefv2
    await token0.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);
    await token1.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);

    await sushiChefWallet.connect(account0).depositLiquidity(
      token0.getAddress(),
      token1.getAddress(),
      AMOUNT, AMOUNT,
      0, 0, 
      MaxUint256,
      2, 0
    );

    // Math.sqrt(5000 * 5000) - 1000 = 4000
    let lpDeposit: number = Number((await masterChefV2.userInfo(0, sushiChefWallet.getAddress())).amount);
    expect(lpDeposit).to.be.eq(4000);
  })

  it('depositLiquidity: addLiquidityETH in sushiswap and deposit masterchefv1', async () => {
    const AMOUNT: number = 100;
    const pairAddress: string = await uniswapV2Router02.viewAddress(token0.getAddress(), weth.getAddress());

    // configuration
    lpsContract = await ethers.getContractAt("UniswapV2ERC20", pairAddress);
    sushiChefWallet = await deploySushiChefWallet(account0, await uniswapV2Router02.getAddress(), await lpsContract.getAddress(), await masterChef.getAddress(), await masterChefV2.getAddress());
    await masterChef.connect(deployer).add(100, lpsContract.getAddress(), true);
    expect(await masterChef.connect(deployer).poolLength()).to.be.eq(2); // se espera que sea 2

    // sushiswap and masterchefv1
    await token0.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);
    await deployer.sendTransaction({
      to: account0.address,
      value: ethers.parseEther("1.0")
    });

    await sushiChefWallet.connect(account0).depositLiquidity(
      token0.getAddress(),
      ZeroAddress,
      AMOUNT, 0,
      0, 0, 
      MaxUint256,
      1, 1,
      { value: ethers.parseEther("0.000000000001") }
    );
    
    // Math.sqrt(100 * 1000000) - 1000 = 9000
    let lpDeposit: number = Number((await masterChef.userInfo(1, sushiChefWallet.getAddress())).amount);
    expect(lpDeposit).to.be.eq(9000);
  }); 

  it('balance of tokens in the contract', async () => {
    const pairAddress: string = await uniswapV2Router02.viewAddress(token0.getAddress(), token1.getAddress());
    // deploys and configuration 
    lpsContract = await ethers.getContractAt("UniswapV2ERC20", pairAddress);
    sushiChefWallet = await deploySushiChefWallet(account0, await uniswapV2Router02.getAddress(), await lpsContract.getAddress(), await masterChef.getAddress(), await masterChefV2.getAddress());

    await token0.connect(deployer).transfer(sushiChefWallet.getAddress(), 1000);
    await token1.connect(deployer).transfer(sushiChefWallet.getAddress(), 3000);
    await deployer.sendTransaction({
      to: sushiChefWallet.getAddress(),
      value: ethers.parseEther("0.000000000001"),
    });

    expect(await sushiChefWallet.getBalance(token0.getAddress())).to.be.eq(1000);
    expect(await sushiChefWallet.getBalance(token1.getAddress())).to.be.eq(3000);
    expect(await sushiChefWallet.getBalance(ZeroAddress)).to.be.eq(1000000);
  });

  it('any token can be withdrawn', async () => {
    const pairAddress: string = await uniswapV2Router02.viewAddress(token0.getAddress(), token1.getAddress());
    // deploys and configuration 
    lpsContract = await ethers.getContractAt("UniswapV2ERC20", pairAddress);
    sushiChefWallet = await deploySushiChefWallet(account0, await uniswapV2Router02.getAddress(), await lpsContract.getAddress(), await masterChef.getAddress(), await masterChefV2.getAddress());

    await token0.connect(account0).transfer(sushiChefWallet.getAddress(), 5000);
    await token1.connect(account0).transfer(sushiChefWallet.getAddress(), 5000);
    await account0.sendTransaction({
      to: sushiChefWallet.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    expect(await token0.balanceOf(account0.address)).to.be.eq(0);
    expect(await token1.balanceOf(account0.address)).to.be.eq(0);
    expect(await ethers.provider.getBalance(account0.address)).to.be.eq(9999987614339104909443n);

    expect(await sushiChefWallet.getBalance(token0.getAddress())).to.be.eq(5000);
    expect(await sushiChefWallet.getBalance(token1.getAddress())).to.be.eq(5000);
    expect(await sushiChefWallet.getBalance(ZeroAddress)).to.be.eq(1000000000000000000n);

    await sushiChefWallet.connect(account0).withdraw(token0.getAddress(), account0.address, 1000);
    await sushiChefWallet.connect(account0).withdraw(token1.getAddress(), account0.address, 3000);
    await sushiChefWallet.connect(account0).withdraw(ZeroAddress, account0.address, 1000000000000000000n);

    expect(await sushiChefWallet.getBalance(token0.getAddress())).to.be.eq(4000);
    expect(await sushiChefWallet.getBalance(token1.getAddress())).to.be.eq(2000);
    expect(await sushiChefWallet.getBalance(ZeroAddress)).to.be.eq(0);

    expect(await token0.balanceOf(account0.address)).to.be.eq(1000);
    expect(await token1.balanceOf(account0.address)).to.be.eq(3000);
    expect(await ethers.provider.getBalance(account0.address)).to.be.eq(10000987468512064393404n);
  });

  it('withdrawLiquidity: tokens and masterchefv1', async () => {
    const AMOUNT: number = 5000;
    const pairAddress: string = await uniswapV2Router02.viewAddress(token0.getAddress(), token1.getAddress());

    // configuration
    lpsContract = await ethers.getContractAt("UniswapV2ERC20", pairAddress);
    sushiChefWallet = await deploySushiChefWallet(account0, await uniswapV2Router02.getAddress(), await lpsContract.getAddress(), await masterChef.getAddress(), await masterChefV2.getAddress());
    await masterChef.connect(deployer).add(100, lpsContract.getAddress(), true);
    expect(await masterChef.connect(deployer).poolLength()).to.be.eq(2); // se espera que sea 2

    // sushiswap and masterchefv1
    await token0.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);
    await token1.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);
    
    await sushiChefWallet.connect(account0).depositLiquidity(
      token0.getAddress(), 
      token1.getAddress(), 
      AMOUNT, AMOUNT, 
      0, 0, 
      MaxUint256, 
      1, 1
    );
    
    // Math.sqrt(5000 * 5000) - 1000 = 4000 
    let lpDeposit: number = Number((await masterChef.userInfo(1, sushiChefWallet.getAddress())).amount);
    expect(lpDeposit).to.be.eq(4000);
    
    {
    // swap
    const AMOUNT_SWAP: number = 2500;
    await token0.connect(account1).approve(uniswapV2Router02.getAddress(), AMOUNT_SWAP);
    expect(await token0.balanceOf(account1)).to.be.eq(AMOUNT_SWAP);
    expect(await token1.balanceOf(account1)).to.be.eq(0);
    let a: Promise<string> = token0.getAddress();
    let b: Promise<string> = token1.getAddress();
    await uniswapV2Router02.connect(account1).swapExactTokensForTokens(AMOUNT_SWAP, 0, [a, b], account1.address, MaxUint256);
    //                       (amountInWithFee * reserveOut) / ((reserveIn * 1000) + amountInWithFee)
    let balanceAfter: number = ((AMOUNT_SWAP * 997) * AMOUNT) / ((AMOUNT * 1000) + (AMOUNT_SWAP * 997));
    expect(await token0.balanceOf(account1)).to.be.eq(0);
    expect(await token1.balanceOf(account1)).to.be.eq(Math.floor(balanceAfter));
    }

    // withdraw
    expect(await sushiChefWallet.getBalance(sushiToken.getAddress())).to.be.eq(0);
    expect(await sushiChefWallet.getBalance(token0.getAddress())).to.be.eq(0);
    expect(await sushiChefWallet.getBalance(token1.getAddress())).to.be.eq(0);

    let blockBefore: number = Number((await masterChef.poolInfo(1)).lastRewardBlock);

    await sushiChefWallet.withdrawLiquidity(
      token0.getAddress(),
      token1.getAddress(),
      lpDeposit,
      0, 0,
      MaxUint256,
      1, 1
    );

    let blockAfter: number = await ethers.provider.getBlockNumber();
//(user.amount * ((pool.accSushiPerShare + ((((blockAfter - START_BLOCK) * BONUS_MULTIPLIER) * SUSHI_PER_BLOCK * allocPoint) / totalAllocPoint) * 1e12) / lpSupply)) / 1e12 - user.rewardDebt 
    let balanceAfterSushi: number = (lpDeposit * ((0 + ((((blockAfter - blockBefore) * 10) * SUSHI_PER_BLOCK * 100) / 200) * 1e12) / lpDeposit)) / 1e12 - 0;

    expect(await sushiChefWallet.connect(account0).getBalance(sushiToken.getAddress())).to.be.eq(balanceAfterSushi);

    //                               ((liquidity * balance) / totalSupply)
    let balanceAfterToken0: number = ((lpDeposit * 7500) / 5000);
    let balanceAfterToken1: number = ((lpDeposit * 3337) / 5000);    
    
    expect(await sushiChefWallet.connect(account0).getBalance(token0.getAddress())).to.be.eq(balanceAfterToken0);
    expect(await sushiChefWallet.connect(account0).getBalance(token1.getAddress())).to.be.eq(Math.floor(balanceAfterToken1));
    
  });

  it('withdrawLiquidity: tokens and masterchefv2', async () => {
    const AMOUNT: number = 5000;
    const pairAddress: string = await uniswapV2Router02.viewAddress(token0.getAddress(), token1.getAddress());

    // configuration 

    lpsContract = await ethers.getContractAt("UniswapV2ERC20", pairAddress);    
    sushiChefWallet = await deploySushiChefWallet(account0, await uniswapV2Router02.getAddress(), await lpsContract.getAddress(), await masterChef.getAddress(), await masterChefV2.getAddress());                  
    await masterChefV2.connect(deployer).add(10, lpsContract.getAddress(), rewarder.getAddress()); 
    expect(await masterChefV2.connect(deployer).poolLength()).to.be.eq(1); // se espera que sea 1

    // sushiswap and masterchefv2
    await mine(10000);
    await masterChefV2.harvestFromMasterChef();

    await token0.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);
    await token1.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);

    await sushiChefWallet.connect(account0).depositLiquidity(
      token0.getAddress(),
      token1.getAddress(),
      AMOUNT, AMOUNT,
      0, 0, 
      MaxUint256,
      2, 0
    );
    let blockBefore: number = Number((await masterChefV2.poolInfo(0)).lastRewardBlock);
    // Math.sqrt(5000 * 5000) - 1000 = 4000
    let lpDeposit: number = Number((await masterChefV2.userInfo(0, sushiChefWallet.getAddress())).amount);
    expect(lpDeposit).to.be.eq(4000);
    
    {
    // swap
    const AMOUNT_SWAP: number = 2500;
    await token0.connect(account1).approve(uniswapV2Router02.getAddress(), AMOUNT_SWAP);
    expect(await token0.balanceOf(account1)).to.be.eq(AMOUNT_SWAP);
    expect(await token1.balanceOf(account1)).to.be.eq(0);
    let a: Promise<string> = token0.getAddress();
    let b: Promise<string> = token1.getAddress();
    await uniswapV2Router02.connect(account1).swapExactTokensForTokens(AMOUNT_SWAP, 0, [a, b], account1.address, MaxUint256);
    //                       (amountInWithFee * reserveOut) / ((reserveIn * 1000) + amountInWithFee)
    let balanceAfter: number = ((AMOUNT_SWAP * 997) * AMOUNT) / ((AMOUNT * 1000) + (AMOUNT_SWAP * 997));
    expect(await token0.balanceOf(account1)).to.be.eq(0);
    expect(await token1.balanceOf(account1)).to.be.eq(Math.floor(balanceAfter));
    }

    // withdraw
    expect(await sushiChefWallet.getBalance(sushiToken.getAddress())).to.be.eq(0);
    expect(await sushiChefWallet.getBalance(token0.getAddress())).to.be.eq(0);
    expect(await sushiChefWallet.getBalance(token1.getAddress())).to.be.eq(0);
    
    await sushiChefWallet.connect(account0).withdrawLiquidity(
      token0.getAddress(),
      token1.getAddress(),
      lpDeposit,
      0, 0,
      MaxUint256,
      2, 0
    );
    let blockAfter: number = await ethers.provider.getBlockNumber();
    
//(user.amount * (pool.accSushiPerShare + ((((block.number - lastRewardBlock) * SUSHI_PER_BLOCK * pool.allocPoint) / totalAllocPoint) * ACC_SUSHI_PRECISION / lpSupply))) / 1e12
    let balanceSushiAfter: number = (lpDeposit * (0 + ((((blockAfter - blockBefore) * 100000 * 10) / 10) * 1e12 / lpDeposit))) / 1e12;
    //                        (sushiAmount * rewardMultiplier) / 1e5
    let balanceRewTokenAfter: number = (balanceSushiAfter * 10) / 1e5; 

    expect(await sushiChefWallet.getBalance(sushiToken.getAddress())).to.be.eq(balanceSushiAfter);
    expect(await sushiChefWallet.getBalance(rewardToken.getAddress())).to.be.eq(balanceRewTokenAfter);

    //                               ((liquidity * balance) / totalSupply)
    let balanceAfterToken0: number = ((lpDeposit * 7500) / 5000);
    let balanceAfterToken1: number = ((lpDeposit * 3337) / 5000);

    expect(await sushiChefWallet.getBalance(token0.getAddress())).to.be.eq(balanceAfterToken0);
    expect(await sushiChefWallet.getBalance(token1.getAddress())).to.be.eq(Math.floor(balanceAfterToken1));
  });

  it('withdrawLiquidity: ETH and masterchefv1', async () => {
    const AMOUNT: number = 1000;
    const pairAddress: string = await uniswapV2Router02.viewAddress(token0.getAddress(), weth.getAddress());

    // configuration
    lpsContract = await ethers.getContractAt("UniswapV2ERC20", pairAddress);
    sushiChefWallet = await deploySushiChefWallet(account0, await uniswapV2Router02.getAddress(), await lpsContract.getAddress(), await masterChef.getAddress(), await masterChefV2.getAddress());
    await masterChef.connect(deployer).add(100, lpsContract.getAddress(), true);
    expect(await masterChef.connect(deployer).poolLength()).to.be.eq(2); // se espera que sea 2

    // sushiswap and masterchefv1
    await token0.connect(account0).transfer(sushiChefWallet.getAddress(), AMOUNT);
    await deployer.sendTransaction({
      to: account0.address,
      value: ethers.parseEther("1.0")
    });

    await sushiChefWallet.connect(account0).depositLiquidity(
      token0.getAddress(),
      ZeroAddress,
      AMOUNT, 0,
      0, 0, 
      MaxUint256,
      1, 1,
      { value: ethers.parseEther("0.000000000001") }
    );
    // Math.sqrt(1000 * 1000000) - 1000 = 30.622
    let lpDeposit: number = Number((await masterChef.userInfo(1, sushiChefWallet.getAddress())).amount);
    expect(lpDeposit).to.be.eq(30622);
    
    {
    // swap  
    const AMOUNT_SWAP: number = 700;
    await token0.connect(account1).approve(uniswapV2Router02.getAddress(), AMOUNT_SWAP);
    expect(await token0.balanceOf(account1)).to.be.eq(2500);
    let a: Promise<string> = token0.getAddress();
    let b: Promise<string> = weth.getAddress();
    await uniswapV2Router02.connect(account1).swapExactTokensForETH(AMOUNT_SWAP, 0, [a, b], account1.address, MaxUint256);
    //                       (amountInWithFee * reserveOut) / ((reserveIn * 1000) + amountInWithFee)
    // let balanceAfter: number = ((AMOUNT_SWAP * 997) * 1000000) / ((AMOUNT * 1000) + (AMOUNT_SWAP * 997));
    expect(await token0.balanceOf(account1)).to.be.eq(1800);
    }

    expect(await sushiChefWallet.connect(account0).getBalance(sushiToken.getAddress())).to.be.eq(0);
    expect(await sushiChefWallet.connect(account0).getBalance(token0.getAddress())).to.be.eq(0);
    expect(await sushiChefWallet.connect(account0).getBalance(ZeroAddress)).to.be.eq(0);

    let blockBefore: number = Number((await masterChef.poolInfo(1)).lastRewardBlock);
  
    await sushiChefWallet.connect(account0).withdrawLiquidity(
      token0.getAddress(),
      ZeroAddress,
      lpDeposit,
      0, 0,
      MaxUint256,
      1, 1
    );
    let blockAfter: number = await ethers.provider.getBlockNumber();
    
//(user.amount * ((pool.accSushiPerShare + (((blockAfter - START_BLOCK) * SUSHI_PER_BLOCK * allocPoint) / totalAllocPoint) * 1e12) / lpSupply)) / 1e12 - user.rewardDebt 
    let balanceAfterSushi: number = (lpDeposit * ((0 + ((((blockAfter - blockBefore) * 10) * SUSHI_PER_BLOCK * 100) / 200) * 1e12) / lpDeposit)) / 1e12 - 0;

    expect(await sushiChefWallet.connect(account0).getBalance(sushiToken.getAddress())).to.be.eq(1499);
  })
});
