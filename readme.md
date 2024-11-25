## Bot 0 - Token Finder

We are looking for CMC + Dextools telegram and Discord community links of any new pool opened in UniswapV2 + Uniswap V2 


## Step1. Bitquery Filtering:

	Filter chain: "matic", "bsc", "Celo", "Base", "Ethereum", 
	Filter protocol: UniswapV2, UniswapV3
	Filter liquidity: ">$25,000 liquidity
 
## Step2. Social Media fetching
Using CMC API to get TelegramGroup + Discord links. 

Note: If a pool is found via Bitquery but there is no social media in Dextools or CMC, we don't prompt this as a result. We only want new pools whose project is reachable on social media. 

## Step3. Prompting

This is prompint on demand as a CSV.
