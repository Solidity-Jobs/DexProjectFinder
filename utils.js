import fetch from "node-fetch";
import { config } from "dotenv";
import fs from "fs";
import fastcsv from "fast-csv";
import DbService from "./db/index.js";

config();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const convertJsonToCsv = async (data, filePath, ctx) => {
  const ws = fs.createWriteStream(filePath);
  await fastcsv
    .write(data, { headers: true })
    .on("finish", async () => {
      console.log("CSV file created successfully.");
      if (ctx) {
        await ctx.replyWithDocument({ source: filePath });
      }
    })
    .pipe(ws);
};

const getBlockchainParams = (network) => {
  let params = {
    network: "",
    contractAddress: "",
    slug: "",
  };
  switch (network) {
    case "bsc-cake":
      params.slug = "bsc";
      params.network = "bsc";
      params.contractAddress = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
      break;
    case "bsc":
      params.slug = "bsc";
      params.network = "bsc";
      params.contractAddress = "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7";
      break;
    case "polygon":
      params.slug = "polygon";
      params.network = "matic";
      params.contractAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
      break;
    default:
      break;
  }
  return params;
};

const getQuery = (params, offset, startDate, endDate) => {
  return `
    query Pools($startDate: ISO8601DateTime!, $endDate: ISO8601DateTime!, $address: [String!]!) {
      ethereum(network: ${params.network}) {
        arguments(
          options: {desc: ["block.height"], limit: 2000, offset: ${offset}}
          date: {between: [$startDate, $endDate]}
          smartContractAddress: {in: $address}
          smartContractEvent: {is: "PairCreated"}
        ) {
          block {
            height
            timestamp {
              time(format: "%Y-%m-%d %H:%M:%S")
            }
          }
          pair: any(of: argument_value, argument: {is: "pair"})
          token0: any(of: argument_value, argument: {is: "token0"})
          token1: any(of: argument_value, argument: {is: "token1"})
        }
      }
    }
  `;
};

const getPairSocials = async (pair) => {
  try {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?address=${pair}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY },
    });
    const data = await response.json();
    if (data.status.error_code === 0) {
      const key = Object.keys(data.data)[0];
      return data.data[key]?.urls?.chat || "N/A";
    }
  } catch (error) {
    console.error(`Error fetching socials for pair ${pair}:`, error);
  }
  return "N/A";
};

const getProviderParams = (chain, pool) => {
  return {
    url: `https://api.dexscreener.com/latest/dex/pairs/${chain.slug}/${pool}`,
    headers: {},
  };
};

const getTokenInfo = async (chain, pools, ctx) => {
  const stableCoins = [
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
    "0x55d398326f99059ff775485246999027b3197955", // USDT
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
    "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
  ];

  const validTokens = [];
  const concurrencyLimit = 50; // Number of pools processed in parallel
  const poolChunks = [];

  for (let i = 0; i < pools.length; i += concurrencyLimit) {
    poolChunks.push(pools.slice(i, i + concurrencyLimit));
  }

  for (const chunk of poolChunks) {
    const results = await Promise.all(
      chunk.map(async (pool) => {
        const provider = getProviderParams(chain, pool.pair);
        try {
          const response = await fetch(provider.url, { headers: provider.headers });
          const data = await response.json();
          if (!data.pair || !data.pair.liquidity) {
            console.log(`No liquidity data for pool ${pool.pair}`);
            return null;
          }
          const liquidity = data.pair.liquidity.usd || 0;
          if (liquidity > 1) {
            const baseToken = stableCoins.includes(pool.token0)
              ? pool.token1
              : pool.token0;
            const socials = await getPairSocials(baseToken);
            return {
              pool: pool.pair,
              token0: pool.token0,
              token1: pool.token1,
              liquidity,
              socials,
            };
          }
        } catch (error) {
          console.error(`Error fetching data for pool ${pool.pair}:`, error);
          return null;
        }
      })
    );

    const filteredResults = results.filter((result) => result !== null);
    validTokens.push(...filteredResults);

    console.log(`Processed ${validTokens.length} valid pools so far.`);
    await sleep(2000); // Optional delay to avoid rate-limiting
  }

  if (validTokens.length > 0) {
    const filePath = "./valid_tokens.csv";
    await convertJsonToCsv(validTokens, filePath, ctx);
  }
};

export const getPools = async (startDate, endDate, chain, ctx) => {
  const blockChainParams = getBlockchainParams(chain);
  let currentIndex = 0;

  while (true) {
    const query = getQuery(blockChainParams, currentIndex, startDate, endDate);
    const variables = {
      startDate,
      endDate,
      address: blockChainParams.contractAddress,
    };

    try {
      const response = await fetch("https://graphql.bitquery.io", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.BITQUERY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      const data = await response.json();
      if (!data || !data.data || !data.data.ethereum.arguments) {
        console.error("No more pools found or invalid response.");
        break;
      }

      const pools = data.data.ethereum.arguments;
      console.log(`Pools found: ${pools.length}`);
      await getTokenInfo(blockChainParams, pools, ctx);

      currentIndex += 2000;
      console.log(`Current index: ${currentIndex}`);
    } catch (error) {
      console.error("Error fetching data:", error);
      break;
    }
  }
};
