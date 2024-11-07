**Whiskers, the AI Feline Chatbot**
=====================================

**Table of Contents**
-----------------

1. [Introduction](#introduction)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Commands](#commands)
7. [Demo](#demo)
8. [Help](#help)

**Introduction**
---------------

Welcome to the Whiskers project! This project is a Discord bot that uses large language models (LLMs) to respond to user messages while adding a fun, feline aspect. The bot is designed to be highly customizable and can be integrated with various AI models (with an OpenAI Compatible API) to provide more intelligent responses.

**Features**
-----------

Whiskers has the following features:

*   Highly customizable
*   Integrates with various AI models (with an OpenAI Compatible API)
*   Custom created profiles by Administrators
*   Supports multiple chat channels
*   Allows administrators to switch between different models and profiles
*   Provides a list of available models and profiles
*   Global /ask slash command that can be used anywhere over Discord
*   Clears conversation history
*   Displays help messages

**Getting Started**
-------------------

To get started with Whiskers, follow these steps:

1.  Clone the repository
2.  Install the required dependencies using `npm install`
3.  Create a new Discord bot on the Discord Developer Portal
4.  Create a new `.env` file and add the following environment variables:
    *   `DISCORD_BOT_TOKEN`: your bot's token
    *   `ADMIN_USER_ID`: the ID of the user who will have administrative privileges
    *   `ASK_WHITE_LISTED_USER_IDS`: a comma-separated list of user IDs who can ask questions
    *   `TARGET_CHANNEL_IDS`: a comma-separated list of channel IDs where the bot will be active
    *   `BANNED_USERS_FILE`: the path to the file containing banned user IDs
    *   `WHITELISTED_SERVER_IDS`: a comma-separated list of server IDs where the bot will be active
    *   `MAX_MESSAGE_HISTORY`: the maximum number of messages to store in the conversation history
    *   `OPENAI_API_KEY`: your OpenAI API key
5.  Run the bot using `node index.mjs`

**Configuration**
---------------

Whiskers can be configured using the following environment variables:

*   `DISCORD_BOT_TOKEN`: your bot's token
*   `ADMIN_USER_ID`: the ID of the user who will have administrative privileges
*   `ASK_WHITE_LISTED_USER_IDS`: a comma-separated list of user IDs who can ask questions
*   `TARGET_CHANNEL_IDS`: a comma-separated list of channel IDs where the bot will be active
*   `BANNED_USERS_FILE`: the path to the file containing banned user IDs
*   `WHITELISTED_SERVER_IDS`: a comma-separated list of server IDs where the bot will be active
*   `MAX_MESSAGE_HISTORY`: the maximum number of messages to store in the conversation history
*   `OPENAI_API_KEY`: your OpenAI API key

**Usage**
---------

To use Whiskers, simply send a message to the bot in a channel where it is active. The bot will respond with a message.

### **Commands**

Whiskers has the following commands:

*   `/model <model_name>`: Switch to a different model
*   `/profile <profile_name>`: Switch to a different profile
*   `/models`: List available models
*   `/ask <question>`: Ask a question globally or within a server 
*   `/resethistory`: Clear conversation history
*   `/help`: Display help message

**Demo**
--------

If you would like to Demo Whiskers, you could join the testing server here: https://discord.gg/VTu9He9sdD

Do note that some features may be limited to prevent abuse.

**Help**
--------

If you have any questions, please create an issue here on GitHub and I'll do anything I can to help!