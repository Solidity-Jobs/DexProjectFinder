import { Telegraf } from 'telegraf'
import { config } from 'dotenv'
import { message } from 'telegraf/filters'
import Dbservice from "./db/index.js";
import { getPools } from './utils.js';
config()

const bot = new Telegraf(process.env.BOTFATHER_API_KEY, {
  handlerTimeout: Infinity,
});
let chain = ""

const getKeyboardCommands = () => {
  const commandList = {
    inline_keyboard: [
      [
        { text: "Start query", callback_data: "query" },
        { text: "Fetch tokens", callback_data: "fetch" }
      ]
    ]
  }
  return commandList
}
const getChainKeyboardCommands = () => {
  const commandList = {
    inline_keyboard: [
      [
        { text: "BSC", callback_data: "chain:bsc" },
        { text: "Polygon", callback_data: "chain:matic" },
      ],
    ],
  }
  return commandList
}
bot.start((ctx) => {
  const commandList = getKeyboardCommands()
  const options = {
    reply_markup: commandList
  }
  ctx.sendMessage("Welcome to TokenFinder!", options)
})

bot.action("query", async (ctx) => {
  const commandList = {
    inline_keyboard: [
      [
        { text: "BSC-Pancake", callback_data: "query:bsc-cake" },
        { text: "BSC-Uniswap", callback_data: "query:bsc" },
        { text: "Polygon", callback_data: "query:matic" },
      ],
    ],
  }
  const options = {
    reply_markup: commandList
  }
  ctx.sendMessage("Choose your chain", options);
});

bot.action("fetch", async (ctx) => {
  const commandList = getChainKeyboardCommands()
  const options = {
    reply_markup: commandList
  }
  ctx.sendMessage("Choose your chain", options);
});

bot.action(/^chain:(\w+)/, async (ctx) => {
  const query = ctx.update.callback_query.data;
  const blockchain = query.split(":")[1];
  const tokens = await Dbservice.findSelect({ chain: blockchain }, "tokens", {
    _id: 0,
  });

  if (tokens.length >= 20) {
    let index = 0;
    let size = 15;
    while (tokens.length > index) {
      let t = tokens.splice(index, size);
      ctx.reply(`Tokens:${JSON.stringify(t, null, 2)}`);
    }
  } else {
    ctx.reply(`Tokens:${JSON.stringify(tokens, null, 2)}`);
  }
});

bot.action(/^query:(bsc|matic|bsc-cake)$/, async (ctx) => {
  chain = ctx.callbackQuery.data.split(":")[1]
  const message = `To start query, please input the start and end date in this format \n` +
    `Example: startDate=2024-01-01, endDate=2024-05-05`
  return ctx.reply(message)
})

bot.on(message("text"), async (ctx) => {
  const date = ctx.message.text.trim().split(",").reduce((obj, param) => {
    const [key, value] = param.trim().split('=');
    obj[key] = value;
    return obj;
  }, {})
  await getPools(date.startDate, date.endDate, chain, ctx)
})

bot.launch();
Dbservice.connect();
console.log("Running TokenFinder");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));