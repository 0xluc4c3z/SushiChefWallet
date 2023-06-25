# SushiChefWallet - Challenge

Wallet that encapsulates all the actions necessary to enter/exit the Sushiswap's liquidity mining program in a single, handy transaction. Based on what was proposed in this challenge: 
[SushiSwap - Blockchain Developer](https://github.com/Lucacez/SushiChefWallet/blob/main/docs/Sushiswap%20-%20Blockchain%20Developer.pdf)

## Tests
### Hardhat
To install dependencies:

Run `npm install` to install dependencies and run `npx hardhat compile` to compile the project.

For testing simply run: 
```
npx hardhat test
```

## Deploy
To deploy it on ethereum mainnet, first uncomment the mainnet network:
```
  networks: {
    hardhat: {},
    //mainnet: {
      //url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_APY_KEY}`,
      //accounts: [`0x${process.env.PRIVATE_KEY}`]
    //}
  },
```

Then copy the `.env.example` to a file called `.env` and add an [Alchemy Node ID](https://www.alchemy.com/) for ETH-MAINNET under the variable `ALCHEMY_APY_KEY`, and add your private key to `PRIVATE_KEY`

And finally make sure to enter the LP address according to the pool you want to join:
```
  const LPs = "DEPENDS_ON_THE_POOL"
```
