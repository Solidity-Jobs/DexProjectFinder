import fetch from "node-fetch";
import { config } from "dotenv";
import fs from "fs";
import fastcsv from "fast-csv";
import { promisify } from "util";
import DbService from "./db/index.js"; // Ensure DbService is imported correctly

config();
const ADDRESS = "https://public-api.dextools.io/trial/v2";
const TOKEN = process.env.DEXTOOLS_API_KEY || process.env.DEXTOOLS_TOKEN;
const CMC_API_KEY = process.env.CMC_API_KEY;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convert JSON data to CSV and send it as a Telegram document

export const convertJsonToCsv = async (data, filePath, ctx) => {
  if (data.length === 0) {
    console.log("No data to write to CSV.");
    return;
  }

  // Log data before attempting to write to CSV
  console.log("Data to write to CSV:", JSON.stringify(data, null, 2));

  const flattenedData = data;

  // Ensure directory exists and the file can be written
  try {
    const dir = filePath.split("/").slice(0, -1).join("/");
    if (!fs.existsSync(dir) && dir !== "") {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.error("Error ensuring directory exists:", error);
    return;
  }

  // Create a writable stream for the CSV file
  const ws = fs.createWriteStream(filePath);

  // Wrap the fastcsv write stream in a promise to handle the finish event
  const writeCsvPromise = new Promise((resolve, reject) => {
    const csvStream = fastcsv
      .write(flattenedData, { headers: true })
      .on("finish", () => {
        console.log("CSV file created successfully.");
        resolve();
      })
      .on("error", (err) => {
        console.error("Error writing to CSV:", err);
        reject(err);
      });

    // Pipe the data to the writable stream
    console.log("Piping data to the file...");
    csvStream.pipe(ws);
  });

  try {
    // Wait for the CSV writing process to finish
    await writeCsvPromise;

    // Log that the stream has finished
    console.log("CSV stream finished and closed.");

    // Explicitly flush the file stream to ensure data is written before we move on
    ws.end(); // Explicitly end the stream here

    // Check the file content
    fs.readFile(filePath, "utf8", (err, content) => {
      if (err) {
        console.error("Error reading CSV file:", err);
      } else {
        console.log("File content:", content);
      }
    });

    // Send the CSV file to Telegram if data is available
    if (ctx) {
      try {
        await ctx.replyWithDocument({ source: filePath });
        console.log("CSV file sent successfully.");
      } catch (error) {
        console.error("Error sending CSV file via Telegram:", error);
      }
    }
  } catch (error) {
    console.error("Error during CSV writing process:", error);
  }
};

// Get blockchain parameters based on network and version
const getBlockchainParams = (network, version) => {
  let params = {
    network: "",
    contractAddress: "",
    slug: "",
  };
  switch (network) {
    case "bsc":
      params.slug = "bsc";
      params.network = "bsc";
      params.contractAddress =
        version === "v2"
          ? "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6"
          : "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7";
      break;
    case "base":
      params.slug = "base";
      params.network = "base";
      params.contractAddress =
        version === "v2"
          ? "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6"
          : "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
      break;
    case "polygon":
      params.slug = "polygon";
      params.network = "matic";
      params.contractAddress =
        version === "v2"
          ? "0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C"
          : "0x1F98431c8aD98523631AE4a59f267346ea31F984";
      break;
    default:
      break;
  }
  return params;
};

const fetchFromCMC = async (pair, symbol) => {
  console.log("Triggered fetchFromCMC function for pair:", pair);

  // Validate input
  if (typeof pair !== "string" || !pair.trim()) {
    console.log("Invalid pair provided. Must be a non-empty string.");
  }

  const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?symbol=${symbol}address=${pair}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "X-CMC_PRO_API_KEY": CMC_API_KEY },
    });

    const data = await response.json();
    console.log("CoinMarketCap data received:", data);

    // Check for successful data retrieval
    // if (data.status.error_code === 0 && data.data) {
    //   const key = Object.keys(data.data)[0];
    //   return data.data[key]?.urls?.chat ?? "N/A"; // Using nullish coalescing
    // } else {
    //   console.warn("No valid data found in response.");
    // }
  } catch (error) {
    console.error(`Error fetching socials from CMC for pair ${pair}:`, error);
  }

  return "N/A"; // Return default value on failure or no data
};

const savePoolDataToDb = async (validTokens) => {
  try {
    const filteredTokens = validTokens.filter((token) => {
      return (
        token &&
        token.pool &&
        token.token0 &&
        token.token1 &&
        token.liquidity &&
        token.socials
      );
    });

    if (filteredTokens.length > 0) {
      await DbService.insertAll(filteredTokens, "pools");
      console.log("Pool data saved to the database successfully.");
    } else {
      console.log("No valid tokens to save.");
    }
  } catch (error) {
    console.error("Error saving pool data to the database:", error);
  }
};

const makeRequest = async (url) => {
  console.log("make request url::", url);
  const retries = 3;
  try {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-API-KEY": TOKEN,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      // console.log("token data", data.data);
      if (data) {
        return data.data;
      } else {
        console.log("request data is failed..");
        await sleep(600);
      }
    }
    // if (data) return data.data;
  } catch (error) {
    console.log("make a request error: ", error);
  }
};

const fetchPoolsBetweenDates = async (chain, startDate, endDate, ctx) => {
  let currentDate = new Date(startDate);
  endDate = new Date(endDate);

  const totalResults = []; // To store accumulated results

  // Loop through each day in the date range
  while (currentDate <= endDate) {
    const from = currentDate.toISOString();
    const to = new Date(currentDate);
    to.setUTCDate(currentDate.getUTCDate() + 1); // Move to the next day
    const endpointUrl = `${ADDRESS}/pool/${chain}?sort=creationTime&order=asc&from=${from}&to=${to.toISOString()}&pageSize=50`;

    try {
      const results = await fetchAllResults(endpointUrl);
      totalResults.push(...results); // Combine results from all pages
      currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Move to the next day
    } catch (error) {
      console.error(
        `Error fetching data from ${from} to ${to.toISOString()}:`,
        error.message
      );
    }
    await sleep(1000);
  }
  ctx.reply(`0/${totalResults.length}`);
  return totalResults; // Return combined results
};

// Helper function to fetch all results from a given URL
const fetchAllResults = async (url) => {
  let results = [];
  let page = 0;
  let totalPages;
  // console.log("fetchResult==>", url);
  const retries = 3;

  do {
    try {
      for (let attempt = 1; attempt <= retries; attempt++) {
        const response = await fetch(`${url}&page=${page}`, {
          method: "GET",
          headers: {
            "X-API-KEY": TOKEN,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.statusCode === 200) {
          // console.log("data==>", data);

          const { totalPages: tp, results: pageResults } = data.data;
          totalPages = tp;
          // console.log(tp);
          results.push(...pageResults);
          break;
        } else {
          console.error(`Received unexpected status code ${data.statusCode}`);
          await sleep(600);
        }
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
    }

    page++;
    await sleep(1000);
  } while (page <= totalPages);

  return results;
};

// Helper function to extract token addresses
const extractTokenAddresses = async (allPools, version, chain, ctx) => {
  const stableCoins = [
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
    "0x55d398326f99059ff775485246999027b3197955", // USDT
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
    "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
    "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270", // WMATIC
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT (Polygon)
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC (Polygon)
    "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", // WETH (Polygon)
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // FDUSD
  ];
  const poolData = [];
  let count = 0;
  console.log("all Pools length==>", allPools.length);
  for (const pool of allPools) {
    count++;
    if (count % 100 == 0) {
      await ctx.reply(`${count} / ${allPools.length}`);
    }
    const exchangeName = pool.exchange?.name;
    const versonName = version === "v2" ? "Uniswap V2" : "Uniswap V3";
    if (exchangeName === versonName) {
      const poolAddress = pool.address;
      const liquidity = await getLiquidity(chain, poolAddress);
      console.log("liquidity==>", liquidity);

      if (liquidity > 5) {
        const mainTokenAddress = pool.mainToken?.address;
        const sideTokenAddress = pool.sideToken?.address;

        const baseToken = stableCoins.includes(mainTokenAddress)
          ? sideTokenAddress
          : mainTokenAddress;
        await sleep(500);
        const socialInfo = await getSocialInfo(chain, baseToken);
        console.log("tg info ==>", socialInfo);

        const tokenInfo = await getDSinfo(baseToken);
        const tgFromDs =
          tokenInfo.length > 0 ? (tgFromDs = tokenInfo.join(", ")) : "";
        console.log("Token info from Dexscreener=>", tgFromDs);

        const tgUrlFromCMC = await fetchFromCMC(poolAddress, chain);
        console.log("tgUrlFromCMC==>", tgUrlFromCMC);

        if (
          socialInfo.telegram != "N/A" ||
          socialInfo.email != "N/A" ||
          tgFromDs != ""
        ) {
          poolData.push({
            Name: poolAddress,
            TgInfo: socialInfo.telegram,
            email: socialInfo.email,
            Notes: "",
            CA: baseToken,
            TgfromDS: tgFromDs,
            TgfromCMC: tgUrlFromCMC,
          });
        }
      }
    }
  }
  return poolData;
};

const getLiquidity = async (chain, poolAddress) => {
  const url = `${ADDRESS}/pool/${chain}/${poolAddress}/liquidity`;
  const response = await makeRequest(url);
  // console.log("liquidity response ==>", response);
  if (response) return response.liquidity;
};

const getSocialInfo = async (chain, tokenAddress) => {
  const url = `${ADDRESS}/token/${chain}/${tokenAddress}`;

  try {
    const data = await makeRequest(url);

    if (data && data.socialInfo) {
      // console.log(data.socialInfo);
      const telegramUrl = data.socialInfo.telegram || "N/A";
      const email = data.socialInfo.email || "N/A";
      console.log("Telegram info retrieved:", telegramUrl, email);
      return { telegram: telegramUrl, email: email };
    } else {
      console.warn("No social info found in the response:", data);
      return { telegram: "N/A", email: "N/A" };
    }
  } catch (error) {
    console.error(
      `Error fetching social info for token ${tokenAddress} on chain ${chain}:`,
      error
    );
    return { telegram: "N/A", email: "N/A" };
  }
};

const getDSinfo = async (tokenAddress) => {
  console.log("Fetching data from Dexscreener...");

  // Validate tokenAddress input
  if (typeof tokenAddress !== "string" || tokenAddress.trim() === "") {
    console.log("Invalid token address provided.");
    return [];
  }

  const url = `https://api.dexscreener.com/latest/dex/pairs/{chainId}/{pairId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    // Check if data and pairs exist
    if (!data || !data.pairs || data.pairs.length === 0) {
      console.log("No pairs found in the response.");
      return [];
    }

    const tgUrls = [];

    // Process the pairs for Telegram URLs
    for (const pair of data.pairs) {
      const socials = pair.info?.social || [];

      // Find any social with platform 'telegram'
      for (const social of socials) {
        if (social.platform === "telegram" && social.handle) {
          tgUrls.push(social.handle);
          console.log(`Found Telegram URL: ${social.handle}`);
        }
      }
    }

    if (tgUrls.length === 0) {
      console.log("No Telegram social info found.");
    }

    return tgUrls;
  } catch (error) {
    console.error("An error occurred while fetching DS info:", error.message);
    return []; // Return an empty array on error
  }
};

export const getPools = async (startDate, endDate, chain, version, ctx) => {
  const blockChainParams = getBlockchainParams(chain, version);
  const { network, contractAddress, slug } = blockChainParams;
  console.log(version, slug);

  try {
    await ctx.reply("Calculating.....");
    const allPools = await fetchPoolsBetweenDates(
      slug,
      startDate,
      endDate,
      ctx
    );
    const poolData = await extractTokenAddresses(allPools, version, chain, ctx);
    console.log(poolData.length);

    if (poolData.length > 0) {
      convertJsonToCsv(poolData, "valid_tokens.csv", ctx);
    } else {
      await ctx.reply("No More Valid Tokens to Process");
      console.log("No valid tokens found to process.");
    }
  } catch (error) {
    console.error("Error during token processing:", error);
    await ctx.reply("An error occurred while processing tokens.");
  }
};
