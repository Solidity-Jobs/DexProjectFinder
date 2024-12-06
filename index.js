import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { message } from 'telegraf/filters';
import Dbservice from './db/index.js';
import { getPools } from './utils.js';
import fs from 'fs';

config();

const bot = new Telegraf(process.env.BOTFATHER_API_KEY, {
  handlerTimeout: Infinity,
});

let chain = '';
let version = 'v2'; // Default version can be set to "v2" or "v3"

// Generate keyboard for the main menu
const getKeyboardCommands = () => {
  const commandList = {
    inline_keyboard: [
      [
        { text: 'Start query', callback_data: 'query' },
        { text: 'Fetch tokens', callback_data: 'fetch' },
      ],
    ],
  };
  return commandList;
};

// Generate keyboard for chain selection
const getChainKeyboardCommands = () => {
  const commandList = {
    inline_keyboard: [
      [
        { text: 'BSC', callback_data: 'chain:bsc' },
        { text: 'Polygon', callback_data: 'chain:polygon' },
        { text: 'Base', callback_data: 'chain:base' },
      ],
    ],
  };
  return commandList;
};

// Start command - welcomes the user
bot.start((ctx) => {
  const commandList = getKeyboardCommands();
  const options = {
    reply_markup: commandList,
  };
  ctx.reply('Welcome to TokenFinder!', options);
});

// Action for 'Start query' - prompting user to choose a chain
bot.action('query', async (ctx) => {
  const commandList = getChainKeyboardCommands();
  const options = {
    reply_markup: commandList,
  };
  ctx.reply('Choose your chain and version', options);
});

// Action for 'Fetch tokens' - prompting user to choose a chain
bot.action('fetch', async (ctx) => {
  const commandList = getChainKeyboardCommands();
  const options = {
    reply_markup: commandList,
  };
  ctx.reply('Choose your chain', options);
});

// Handle chain selection for querying pools
bot.action(/^chain:(bsc|polygon|base)$/, async (ctx) => {
  const query = ctx.update.callback_query.data;
  chain = query.split(':')[1];

  const commandList = {
    inline_keyboard: [
      [
        { text: 'V2', callback_data: 'version:v2' },
        { text: 'V3', callback_data: 'version:v3' },
      ],
    ],
  };

  const options = {
    reply_markup: commandList,
  };
  ctx.reply(`You selected ${chain.toUpperCase()}, now choose the version`, options);
});

// Handle version selection
bot.action(/^version:(v2|v3)$/, async (ctx) => {
  version = ctx.callbackQuery.data.split(':')[1];
  const message = `You selected version ${version}. Now, please input the start and end date in this format \n` +
    `Example: startDate=2024-01-01, endDate=2024-05-05`;

  return ctx.reply(message);
});

// Handle date input and start the token pool query
bot.on(message('text'), async (ctx) => {
  const date = ctx.message.text.trim().split(',').reduce((obj, param) => {
    const [key, value] = param.trim().split('=');
    obj[key] = value;
    return obj;
  }, {});

  if (date.startDate && date.endDate) {
    await getPools(date.startDate, date.endDate, chain, version, ctx);
  } else {
    await ctx.reply("Please ensure your dates are in the correct format: `startDate=YYYY-MM-DD, endDate=YYYY-MM-DD`.");
  }
});

// Utility sleep function to wait for a few seconds
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Launch the bot and connect to the database
bot.launch();
Dbservice.connect();
console.log('Running TokenFinder');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

