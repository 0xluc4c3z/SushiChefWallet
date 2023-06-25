// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {Owned} from "solmate/src/auth/Owned.sol";
import {SafeTransferLib, ERC20} from "solmate/src/utils/SafeTransferLib.sol";
import {IUniswapV2Router01} from "./external/interfaces/IUniswapV2Router01.sol";
import {IMasterChef} from "./external/interfaces/IMasterChef.sol";
import {IMiniChefV2} from "./external/interfaces/IMiniChefV2.sol";

/**
 * @title SushiChefWallet
 * @author Lucacez
 * @notice Wallet that encapsulates all the actions necessary to enter/exit 
 *         the Sushiswap's liquidity mining program in a single, handy transaction.
 */
contract SushiChefWallet is Owned {
    
    using SafeTransferLib for ERC20;
    using SafeTransferLib for address;

    address immutable public sushiswap;
    ERC20 immutable public LPs;
    address immutable public masterChef;
    address immutable public masterChefV2;

    constructor(
        address _sushiswap, 
        ERC20 _LPs, 
        address _masterChef, 
        address _masterChefV2
        ) Owned(msg.sender) 
    {
        sushiswap = _sushiswap;
        LPs = _LPs;
        masterChef = _masterChef;
        masterChefV2 = _masterChefV2;
    }

    /** 
     * @notice Function that encapsulates all the actions required to join SushiSwap’s liquidity mining program into a single, handy transaction.
     * @dev Enters the liquidity pool according to your tokens and the version of masterchef indicated.
     * @param tokenA Address of one of the tokens of the pair.
     * @param tokenB Address of one of the tokens of the pair. If you want to deposit ether enter address(0). 
     * @param amountADesired The amount of tokenA to be deposited.
     * @param amountBDesired The amount of tokenB to be deposited. If you deposit ether, the msg.value is taken.
     * @param amountAMin Minimum amount of tokenA to be deposited. ????
     * @param amountBMin Minimum amount of tokenB to be deposited. ????
     * @param deadline Deposit time gap.
     * @param version masterchef version, 1 or 2.
     * @param index Masterchef pool index to deposit the lps.
     */
    function depositLiquidity( 
        address tokenA, 
        address tokenB, 
        uint256 amountADesired, 
        uint256 amountBDesired, 
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline,
        uint256 version, 
        uint256 index
    ) external payable onlyOwner {
        uint256 lps;
        if(tokenB == address(0)){
            ERC20(tokenA).safeApprove(sushiswap, amountADesired);
            (, , lps) = IUniswapV2Router01(
                sushiswap).addLiquidityETH{ value: msg.value }(
                    tokenA,
                    amountADesired,
                    amountAMin,
                    amountBMin,
                    address(this),
                    deadline
                );
        }else{
            ERC20(tokenA).safeApprove(sushiswap, amountADesired);
            ERC20(tokenB).safeApprove(sushiswap, amountBDesired);

            (, , lps) = IUniswapV2Router01(
                sushiswap).addLiquidity(
                    tokenA, 
                    tokenB, 
                    amountADesired, 
                    amountBDesired, 
                    amountAMin,
                    amountBMin, 
                    address(this), 
                    deadline
                );
        }

        if (version == 1){
            LPs.safeApprove(masterChef, lps);
            IMasterChef(masterChef).deposit(index, lps);
        }else if (version == 2){
            LPs.safeApprove(masterChefV2, lps);
            IMiniChefV2(masterChefV2).deposit(index, lps, address(this));
        } 
    }

    /** 
     * @notice Function that encapsulates all actions required to exit the SushiSwap liquidity mining program into a single, handy transaction.
     * @dev Exits the liquidity pool, withdraws according to the amounts entered and the version of masterchef indicated.
     * @param tokenA Address of one of the tokens of the pair.
     * @param tokenB Address of one of the tokens of the pair. If you want to withdraw ether enter address(0). 
     * @param amount The amount of tokenA to be deposited.
     * @param amountAMin Minimum amount of tokenA to be withdrawn. 
     * @param amountBMin Minimum amount of tokenB to be withdrawn. 
     * @param deadline Withdraw time gap.
     * @param version masterchef version, 1 or 2.
     * @param index Masterchef pool index to withdraw the lps.
     */
    function withdrawLiquidity(
        address tokenA,
        address tokenB,
        uint256 amount,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline,
        uint256 version,
        uint256 index
    ) onlyOwner external {
        if (version == 1){
            // (uint256 amount, ) = IMasterChef(masterChef).userInfo(index, address(this));
            IMasterChef(masterChef).withdraw(index, amount);
        }else if (version == 2){
            getSushi(2, index);
            IMiniChefV2(masterChefV2).withdraw(index, amount, address(this));   
        }

        LPs.safeApprove(sushiswap, amount);
        if(tokenB == address(0)){
            IUniswapV2Router01(
                sushiswap).removeLiquidityETH(
                    tokenA,
                    amount,
                    amountAMin,
                    amountBMin,
                    address(this),
                    deadline
                );
        }else{
            IUniswapV2Router01(
                sushiswap).removeLiquidity(
                    tokenA,
                    tokenB,
                    amount,
                    amountAMin,
                    amountBMin,
                    address(this),
                    deadline
                );
        }
    }

    /** 
     * @notice Function that takes pending sushitokens.
     * @dev The deposit method with 0 values of masterchef allows to obtain the pending tokens.
     */
    function getSushi(uint256 version, uint256 index) onlyOwner public {
        if(version == 1){
            IMasterChef(masterChef).deposit(index, 0);
        }else if (version == 2){
            IMiniChefV2(masterChefV2).harvest(index, address(this));
        }
    }

    /** 
     * @notice token/ether withdrawal function.   
     * @dev Uses the safe functionality of solmate. 
     * @param token Address of token to be withdrawn. If you want to withdraw ether enter address(0).
     * @param to Address to which tokens are to be sent.
     * @param amount The amount to be withdrawn. 
     */
    function withdraw(address token, address to, uint256 amount) onlyOwner external {
        if(token == address(0)){
            to.safeTransferETH(amount);
        }else{
            ERC20(token).safeTransfer(to, amount);
        }
    }

    /** 
     * @notice Obtains the balance of any token in the wallet.  
     * @dev Uses the safe functionality of solmate. 
     * @param token token address. If you want to know ether balance enter address(0)
     */
    function getBalance(address token) external view returns (uint256){
        if(token == address(0)){
            return address(this).balance;
        }else{
            return ERC20(token).balanceOf(address(this));
        }
    }

    /** 
     * @notice Allows this contract to receive ether
     */
    receive() external payable {}
}