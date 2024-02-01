import fetch from "node-fetch";
import { config } from "dotenv";
import DbService from "./db/index.js";
config();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getBlockchainParams = (network) => {
  let params = {
    network: "",
    contractAddress: "",
    slug: "",
  };
  switch (network) {
    case "bsc-cake": 
      params.slug = "bsc"
      params.network = "bsc";
      params.contractAddress = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
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
export const getPools = async () => {
  const getDate = subtractDays(new Date(), 3);
  const date =
    getDate.getFullYear() +
    "-" +
    ("0" + (getDate.getMonth() + 1)) +
    "-" +
    ("0" + getDate.getDate()).slice(-2);
   const blockchains = ["bsc-cake"];
  //const blockchains = ["bsc-cake"]
  for (const chain of blockchains) {
    const blockChainParams = getBlockchainParams(chain);
    const query = getQuery(chain, blockChainParams)
    const variables = {
      date: date,
      address: blockChainParams.contractAddress,
    };
    const response = await fetch("https://graphql.bitquery.io", {
      method: "post",
      headers: {
        "X-API-KEY": process.env.BITQUERY_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    const data = await response.json();
     console.log("1", data, variables)
    if (response.status !== 200) {
      console.error("Failed to request");
      return false;
    }
    if (data.data.ethereum.arguments == 0) {
      console.error("Failed to request");
      return false;
    }
    const pools = data.data.ethereum.arguments;
    console.log("pools", pools.length,  pools);
    await getTokenInfo(blockChainParams, pools);
  }
};

const getTokenInfo = async (chain, pools) => {
  let station = 40;
  let providerIndex = 0;
  const stable = [
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
    "0x55d398326f99059ff775485246999027b3197955",
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    "0xe9e7cea3dedca5984780bafc599bd69add087d56",
    "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  ];
  for (const [index, pool] of pools.entries()) {
    const provider = getProviderParams(chain, providerIndex, pool.pair);
    try {
      console.log(index, provider.url);
      if (index == station) {
        console.log("sleeping.......");
        station += 40;
        await sleep(45000);
      }
      const response = await fetch(provider.url, {
        timeout: 3600000,
        headers: provider.headers,
      });
      const data = await response.json();
      if (providerIndex==0 && data.data== null) continue;
      const metrics =
        providerIndex == 0 ? data.data.metrics.liquidity : data.pair.liquidity.usd;
      if (metrics == null) continue;
      console.log("metrics", metrics);
      if (metrics > 10000) {
        const pair = stable.includes(pool.token0) ? pool.token1 : pool.token0;
        const urls = await getPairSocials(pair);
        console.log("URL", urls);
        if (urls != undefined) {
          await DbService.insert(
            {
              name: `${pool.token0Name}-${pool.token1Name}`,
              chain: chain.network,
              address: pair,
              urls: urls,
            },
            "tokens-2"
          );
        }
      }
    } catch (e) {
      if (e.code === "ECONNRESET") {
        console.log("switch provider....");
      }
    }
  }
  console.log("done......")
};

const getProviderParams = (chain, currentProviderIndex, pool) => {
  let params = {
    url: "",
    headers: "",
  };
  if (currentProviderIndex == 0) {
    params.url = `http://api.dextools.io/v1/pair?chain=${chain.slug}&address=${pool}`;
    params.headers = { "x-api-key": process.env.DEXT_API_KEY };
  }
  if (currentProviderIndex == 1) {
    params.url = `https://api.dexscreener.com/latest/dex/pairs/${chain.slug}/${pool}`;
    params.headers = {};
  }
  return params;
};

export const getPairSocials = async (pair) => {
  console.log("searching for socials.....");
  const path = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?address=${pair}`;
  const resonse = await fetch(path, {
    method: "get",
    timeout: 3600000,
    headers: {
      "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
    },
  });
  const data = await resonse.json();
  if (data.status.error_code == 400) return;
  const key = Object.keys(data.data);
  if (key) {
    const value = data.data[key];
    return value.urls.chat;
  }
};

const subtractDays = (date, days) => {
  date.setDate(date.getDate() - days);
  return date;
};


const getQuery = (network, params) => {
  let query = ""
  if(network == "bsc-cake"){
  query = `
    query Pools($address: [String!]!){
      ethereum(network: bsc) {
        arguments(
          options: {desc: ["block.height","index"], limit:2000, offset:26000}
          date:{between: ["2022-01-01", "2022-12-31"]}
          smartContractAddress: {in: $address}
          smartContractEvent: {is: "PairCreated"}
        ) {
          block {
            height
            timestamp{
              time(format:"%Y-%m-%d %H:%M:%S")
            }
          }
          index
          pair: any(of: argument_value, argument: {is: "pair"})
          token0: any(of: argument_value, argument: {is: "token0"})
          token0Name: any(of: argument_value, argument: {is: "token0"}, as: token_name)
          token1: any(of: argument_value, argument: {is: "token1"})
          token1Name: any(of: argument_value, argument: {is: "token1"}, as: token_name)
        }
      }
    }
    `
  }else{
//     query = `
//     query Pools($address: [String!], $date: ISO8601DateTime!){
//         ethereum(network: ${params.network}) {
//           arguments(
//             date:{since: $date}
//             smartContractAddress: {in: $address}
//             smartContractEvent: {is: "PoolCreated"}
//           ) {
//             block {
//               height
//               timestamp{
//                 time(format:"%Y-%m-%d %H:%M:%S")
//               }
//             }
//             index
//             pair: any(of: argument_value, argument: {is: "pool"})
//             token0: any(of: argument_value, argument: {is: "token0"})
//             token0Name: any(of: argument_value, argument: {is: "token0"}, as: token_name)
//             token1: any(of: argument_value, argument: {is: "token1"})
//             token1Name: any(of: argument_value, argument: {is: "token1"}, as: token_name)
//           }
//         }
//       }
// `;
query = `
query Pools($address: [String!]){
    ethereum(network: ${params.network}) {
      arguments(
        options: {desc: ["block.height","index"], limit:1500, offset:1500}
        date:{between: ["2023-01-01", "2023-09-30"]}
        smartContractAddress: {in: $address}
        smartContractEvent: {is: "PoolCreated"}
      ) {
        block {
          height
          timestamp{
            time(format:"%Y-%m-%d %H:%M:%S")
          }
        }
        index
        pair: any(of: argument_value, argument: {is: "pool"})
        token0: any(of: argument_value, argument: {is: "token0"})
        token0Name: any(of: argument_value, argument: {is: "token0"}, as: token_name)
        token1: any(of: argument_value, argument: {is: "token1"})
        token1Name: any(of: argument_value, argument: {is: "token1"}, as: token_name)
      }
    }
  }
`;
  }
  return query
}