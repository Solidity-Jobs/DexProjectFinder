## Bot 0 - Token Finder

We are looking for CMC + Dextools telegram and Discord community links of any new pool opened in UniswapV3. 
https://t.me/+F-ekHKUFqFc0MmY0

## Step1. Bitquery Filtering:

	Filter chain: "matic", "bsc".
	Filter protocol: UniswapV3, Pancakeswap
	Filter liquidity: ">$15,000 liquidity
	Filter volumen: "<$1000000"
 
## Step2. Social Media fetching
Using CMC API to get TelegramGroup + Discord links. 

Note: If a pool is found via Bitquery but there is no social media in Dextools or CMC, we don't prompt this as a result. We only want new pools whose project is reachable on social media. 

## Step3. Prompting

Prompt frequency: 24 hours

Prompt outputs:
 	
  	CMC listing: "www.coinmarketcap.com/token/AAA "
	
	New Pool: "Dextools.com/pool/0xAAA"
 	
	Social Media: "t.me/group"
											
## V2.0 Auto-message

After getting Discord or TG groupd link, we need to automatic send messages to public channels and DM.	


	if Discord: Send message to all public channels. 
	if Telegram group: Send message to group (if there is not antibot)
	+ Send message to the first 100 users of the telegram group. 