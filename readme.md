
# DexProjectFinder

DexProjectFinder is a Node.js-based tool for analyzing token data using Bitquery and managing it through MongoDB. It includes integration with Telegram to notify users about updates.

---

## Features

- **Token Analysis:** Utilizes Bitquery API for blockchain data analysis.
- **Database Management:** MongoDB is used to store and manage token data.
- **Telegram Integration:** Sends real-time updates via a Telegram bot.

---

## Prerequisites

Before running the project, ensure the following software and accounts are ready:

1. **Node.js:** Download and install [Node.js](https://nodejs.org/).
2. **MongoDB:** Install and set up [MongoDB](https://www.mongodb.com/try/download/community) locally or use a cloud MongoDB instance like [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
3. **Bitquery API Key:** Get an API key by signing up at [Bitquery](https://bitquery.io/).
4. **Telegram Bot:** Create a bot using [BotFather](https://core.telegram.org/bots#botfather) and get the token.
5. **DexTools API Token:** Obtain a valid token from DexTools.

---

## Project Setup


### 2. Install Dependencies

Run the following command to install all required packages:

`npm install `



### 3. Configure Environment Variables

Create a `.env` file in the project directory with the following variables:

```
BITQUERY_API_KEY=<Your Bitquery API Key>
TELEGRAM_BOT_TOKEN=<Your Telegram Bot Token>
DEXTOOLS_TOKEN=<Your DexTools API Token>
DB_HOST=mongodb://localhost:27017  # Replace with your MongoDB URI
DB_NAME=dex_project_finder         # Replace with your database name


```


## How to Run

### 1. Start MongoDB

Ensure MongoDB is running. If it's installed locally, you can start it with:

`mongod
`


For MongoDB Atlas, ensure the connection URI in `DB_HOST` is correct.

### 2. Run the Project

Start the application with:

`npm start
`


### Verify Output

* The application should display logs like `Running TokenFinder` and database connection status.
* Telegram notifications will be sent if configured correctly.


## Common Issues and Fixes

1. **MongoDB Connection Error:**
   * Ensure MongoDB is running and `DB_HOST` is set correctly in `.env`.
   * If using MongoDB Atlas, whitelist your IP address in the cluster settings.
2. **Bitquery API Error:**
   * Verify that your `BITQUERY_API_KEY` is active and correct.
3. **Telegram Bot Error:**
   * Ensure your `TELEGRAM_BOT_TOKEN` is valid and the bot is added to your Telegram chat.
4. **Dependencies Missing:**
   * Run `npm install` to ensure all dependencies are installed.
