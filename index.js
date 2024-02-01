import { Telegraf } from "telegraf";
import { config } from "dotenv";
import { getPools } from "./utils.js";
import Dbservice from "./db/index.js";

config();

const bot = new Telegraf(process.env.BOTFATHER_API_KEY, {
  handlerTimeout: Infinity,
});
const initMessage = `
Welcome to TokenFinder! \n
## Commands 
Start token filter automation(Frequency:3days): /StartFilter \n
Fetch tokens by chain: /fetch 
`;
bot.start((ctx) => {
  ctx.sendMessage(initMessage);
});

bot.command("StartFilter", async (ctx) => {
  await getPools();
});

bot.command("fetch", async (ctx) => {
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "BSC", callback_data: "chain:bsc" },
        { text: "Polygon", callback_data: "chain:matic" },
      ],
    ],
  };
  ctx.reply("Choose your chain", { reply_markup: replyMarkup });
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

bot.launch();
Dbservice.connect();
console.log("Running TokenFinder");

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
