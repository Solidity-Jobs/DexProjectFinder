import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { message } from 'telegraf/filters';
import Dbservice from "./db/index.js";
import { getPools, convertJsonToCsv } from './utils.js';
import fs from 'fs';

config();

const bot = new Telegraf(process.env.BOTFATHER_API_KEY, {
  handlerTimeout: Infinity,
});
let chain = "";

// Function to handle safe message sending
const sendMessageSafely = async (ctx, message, options = {}) => {
  try {
    await ctx.telegram.sendMessage(ctx.chat.id, message, options);
  } catch (error) {
    if (error.response?.error_code === 403) {
      console.error(`Bot was blocked by the user. Chat ID: ${ctx.chat.id}`);
    } else {
      console.error(`Failed to send message to Chat ID ${ctx.chat.id}:`, error);
    }
  }
};

// Get keyboard commands for main menu
const getKeyboardCommands = () => ({
  inline_keyboard: [
    [
      { text: "Start query", callback_data: "query" },
      { text: "Fetch tokens", callback_data: "fetch" }
    ]
  ]
});

// Get keyboard commands for chains
const getChainKeyboardCommands = () => ({
  inline_keyboard: [
    [
      { text: "BSC", callback_data: "chain:bsc" },
      { text: "Polygon", callback_data: "chain:matic" },
    ],
  ]
});

bot.start((ctx) => {
  const commandList = getKeyboardCommands();
  const options = { reply_markup: commandList };
  sendMessageSafely(ctx, "Welcome to TokenFinder!", options);
});

bot.action("query", async (ctx) => {
  const commandList = {
    inline_keyboard: [
      [
        { text: "BSC-Pancake", callback_data: "query:bsc-cake" },
        { text: "BSC-Uniswap", callback_data: "query:bsc" },
        { text: "Polygon", callback_data: "query:matic" },
      ],
    ],
  };
  const options = { reply_markup: commandList };
  sendMessageSafely(ctx, "Choose your chain", options);
});

bot.action("fetch", async (ctx) => {
  const commandList = getChainKeyboardCommands();
  const options = { reply_markup: commandList };
  sendMessageSafely(ctx, "Choose your chain", options);
});

bot.action(/^chain:(\w+)/, async (ctx) => {
  const query = ctx.update.callback_query.data;
  const blockchain = query.split(":")[1];
  const tokens = await Dbservice.findSelect({ chain: blockchain }, "tokens", { _id: 0 });
  const csvFilePath = `${blockchain}.csv`;
  await convertJsonToCsv(tokens, csvFilePath);
  await sleep(15000);
  const document = await fs.readFileSync(csvFilePath);
  await ctx.replyWithDocument({ source: document, filename: csvFilePath });
  fs.unlinkSync(csvFilePath);
});

bot.action(/^query:(bsc|matic|bsc-cake)$/, async (ctx) => {
  chain = ctx.callbackQuery.data.split(":")[1];
  const message = `To start query, please input the start and end date in this format \n` +
    `Example: startDate=2024-01-01, endDate=2024-05-05`;
  sendMessageSafely(ctx, message);
});

bot.on(message("text"), async (ctx) => {
  const date = ctx.message.text.trim().split(",").reduce((obj, param) => {
    const [key, value] = param.trim().split('=');
    obj[key] = value;
    return obj;
  }, {});
  await getPools(date.startDate, date.endDate, chain, ctx);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

bot.launch();
Dbservice.connect();
console.log("Running TokenFinder");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
