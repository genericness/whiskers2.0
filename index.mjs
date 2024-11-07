import dotenv from 'dotenv';
import fs from 'fs';
import axios from 'axios';
import { Client, GatewayIntentBits, EmbedBuilder, CommandInteraction, SlashCommandBuilder, ActivityType, REST, Routes } from 'discord.js';
import { OpenAI } from 'openai';

dotenv.config();

const discordToken = process.env.DISCORD_BOT_TOKEN;
const adminUserId = process.env.ADMIN_USER_ID;
const askWhitelistedUserIds = process.env.ASK_WHITE_LISTED_USER_IDS.split(',');
const targetChannelIds = process.env.TARGET_CHANNEL_IDS.split(',');
const bannedUsersFile = process.env.BANNED_USERS_FILE;
const whitelistedServerIds = process.env.WHITELISTED_SERVER_IDS.split(',');
const MAX_MESSAGE_HISTORY = parseInt(process.env.MAX_MESSAGE_HISTORY);
const openaiApiKey = process.env.OPENAI_API_KEY;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

let messageHistory = [];
let phrasesData = null;
let bannedUsers = []; 
let models = null;
let activeModel = process.env.ACTIVE_MODEL;
let activeProfile = process.env.ACTIVE_PROFILE;
let profiles = null;
let userInputs = [];
let threadMap = {};

const loadPhrasesData = () => {
  try {
    phrasesData = JSON.parse(fs.readFileSync('./phrases.json'));
  } catch (err) {
    phrasesData = [];
  }
};

const loadBannedUsers = () => {
  try {
    const bannedUsersData = fs.readFileSync(bannedUsersFile);
    bannedUsers = JSON.parse(bannedUsersData);
  } catch (err) {}
};

const loadProfiles = () => {
  try {
    profiles = JSON.parse(fs.readFileSync('./profiles.json'));
    if (!(activeProfile in profiles)) throw new Error();
  } catch (err) {
    process.exit(1);
  }
};

const loadModels = () => {
  try {
    models = JSON.parse(fs.readFileSync('./models.json'));
    if (!(activeModel in models)) throw new Error();
  } catch (err) {
    process.exit(1);
  }
};

const getRandomPhrases = (numPhrases) => {
  const shuffled = phrasesData.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, numPhrases);
};

const sanitizeMessage = (message) => {
  return message.replace(/@/g, '[at]');
};

async function handleUserInput(message) {
  if (message.author.id === client.user.id) return;
  if (!targetChannelIds.includes(message.channelId) || message.author.bot) return;
  if (message.content.includes('@silent')) return;
  if (message.content.startsWith('/')) return;
  if (message.channel.isThread()) return;

  if (bannedUsers.includes(message.author.id)) {
    const embed = new EmbedBuilder()
      .setTitle('Error')
      .setDescription('You do not have permission to use this command.')
      .setColor(0xFF0000);
    await message.reply({ embeds: [embed] });
  }

  const userInput = {
    userId: message.author.id,
    username: message.author.username,
    message: message.content
  };

  if (fs.existsSync('userInputs.json') && fs.readFileSync('userInputs.json', 'utf-8').trim()) {
    try {
      const inputData = fs.readFileSync('userInputs.json');
      userInputs = JSON.parse(inputData);
    } catch (err) {}
  }

  userInputs.push(userInput);

  fs.writeFileSync('userInputs.json', JSON.stringify(userInputs, null, 2));

  try {
    let userDisplayName = message.author.username;
    if (message.member && message.member.nickname) {
      userDisplayName = message.member.nickname;
    }
    if (!message.channel.isThread()) {
      messageHistory.push(`${userDisplayName}: ${message.content}`);
      if (messageHistory.length > MAX_MESSAGE_HISTORY) messageHistory.shift();
    }

    const recentConversationPrompt = messageHistory.length > 0 ?
      `**Recent Conversation:**\n${messageHistory.join('\n')}` :
      '**Conversation:**';
    const behaviorPrompt = profiles[activeProfile].behaviorPrompt;

    let data = {
      model: models[activeModel].model,
      messages: [
        { role: "system", content: recentConversationPrompt },
        { role: "system", content: behaviorPrompt },
        { role: "user", content: message.content }
      ],
      temperature: 1
    };

    const processingMessage = await message.reply("Processing...");

    if (models[activeModel].endpoint) {
      let response = await axios.post(models[activeModel].endpoint, data, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env[models[activeModel].apiKey]}`
        }
      });
      let generatedText = response.data.choices[0].message.content.trim() || response.data.choices[0].text.trim();
      generatedText = sanitizeMessage(generatedText);

      if (generatedText.length > 2000) {
        const messageChunks = generatedText.match(/(.|[\r\n]){1,2000}/g);

        for (let chunk of messageChunks) {
          const embed = new EmbedBuilder()
            .setTitle('Response')
            .setDescription(chunk)
            .setColor(0x00FF00);
          await processingMessage.edit({ embeds: [embed] });
        }
      } else {
        const embed = new EmbedBuilder()
          .setTitle('Response')
          .setDescription(generatedText)
          .setColor(0x00FF00);
        await processingMessage.edit({ embeds: [embed] });
      }
    } else {
      data = {
        model: data.model,
        prompt: `${recentConversationPrompt}\n${behaviorPrompt}\n\n${message.content}`,
        temperature: data.temperature,
        max_tokens: 2048
      };
      let response = await openai.chat.completions.create(data);
      let generatedText = response.data.choices[0].message.content.trim() || response.data.choices[0].text.trim();
      generatedText = sanitizeMessage(generatedText);

      if (generatedText.length > 2000) {
        const messageChunks = generatedText.match(/(.|[\r\n]){1,2000}/g);

        for (let chunk of messageChunks) {
          const embed = new EmbedBuilder()
            .setTitle('Response')
            .setDescription(chunk)
            .setColor(0x00FF00);
          await processingMessage.edit({ embeds: [embed] });
        }
      } else {
        const embed = new EmbedBuilder()
          .setTitle('Response')
          .setDescription(generatedText)
          .setColor(0x00FF00);
        await processingMessage.edit({ embeds: [embed] });
      }
    }

  } catch (error) {
    console.error('Error generating response:', error);
    const embed = new EmbedBuilder()
      .setTitle('Error')
      .setDescription('Oops! I had trouble with that one. Let\'s try again?')
      .setColor(0xFF0000);
    await message.reply({ embeds: [embed] });
  } finally {
    message.channel.sendTyping();
  }
}

const commands = [
  {
    name: 'model',
    description: 'Switch to a different model',
    options: [
      {
        name: 'model_name',
        description: 'Name of the model to switch to',
        type: 3,
        required: true
      }
    ],
    execute: async (interaction) => {
      if (interaction.user.id !== adminUserId) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('You do not have permission to use this command.')
          .setColor(0xFF0000);
        await interaction.reply({ embeds: [embed] });
        return;
      }

      const newModel = interaction.options.getString('model_name');

      if (!(newModel in models)) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription(`Model "${newModel}" not found.`)
          .setColor(0xFF0000);
        await interaction.reply({ embeds: [embed] });
      } else {
        activeModel = newModel;
        console.log(`Admin changed the model to "${newModel}"`);
        const embed = new EmbedBuilder()
          .setTitle('Success')
          .setDescription(`Switched to "${newModel}" model.`)
          .setColor(0x00FF00);
        await interaction.reply({ embeds: [embed] });
      }
    }
  },
  {
    name: 'ask',
    description: 'Ask a question',
    options: [
      {
        name: 'question',
        description: 'The question to ask',
        type: 3,
        required: true
      }
    ],
    execute: async (interaction) => {
      await interaction.deferReply();

      const question = interaction.options.getString('question');

      try {
        const recentConversationPrompt = messageHistory.length > 0 ?
          `**Recent Conversation:**\n${messageHistory.join('\n')}` :
          '**Conversation:**';
        const behaviorPrompt = profiles[activeProfile].behaviorPrompt;

        let data = {
          model: models[activeModel].model,
          messages: [
            { role: "system", content: recentConversationPrompt },
            { role: "system", content: behaviorPrompt },
            { role: "user", content: question }
          ],
          temperature: 1
        };

        if (models[activeModel].endpoint) {
          let response = await axios.post(models[activeModel].endpoint, data, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env[models[activeModel].apiKey]}`
            }
          });
          let generatedText = response.data.choices[0].message.content.trim() || response.data.choices[0].text.trim();
          generatedText = sanitizeMessage(generatedText);

          const embed = new EmbedBuilder()
            .setTitle('Response')
            .setDescription(generatedText)
            .setColor(0x00FF00);
          await interaction.editReply({ embeds: [embed] });
        } else {
          data = {
            model: data.model,
            prompt: `${recentConversationPrompt}\n${behaviorPrompt}\n\n${question}`,
            temperature: data.temperature,
            max_tokens: 2048
          };
          let response = await openai.chat.completions.create(data);
          let generatedText = response.data.choices[0].message.content.trim() || response.data.choices[0].text.trim();
          generatedText = sanitizeMessage(generatedText);

          const embed = new EmbedBuilder()
            .setTitle('Response')
            .setDescription(generatedText)
            .setColor(0x00FF00);
          await interaction.editReply({ embeds: [embed] });
        }
      } catch (error) {
        console.error('Error generating response:', error);
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('Oops! I had trouble with that one. Let\'s try again?')
          .setColor(0xFF0000);
        await interaction.editReply({ embeds: [embed] });
      }
    }
  },
  {
    name: 'profile',
    description: 'Switch to a different profile',
    options: [
      {
        name: 'profile_name',
        description: 'Name of the profile to switch to',
        type: 3,
        required: true
      }
    ],
    execute: async (interaction) => {
      if (interaction.user.id !== adminUserId) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('You do not have permission to use this command.')
          .setColor(0xFF0000);
        await interaction.reply({ embeds: [embed] });
        return;
      }

      const newProfile = interaction.options.getString('profile_name');

      if (!(newProfile in profiles)) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription(`Profile "${newProfile}" not found.`)
          .setColor(0xFF0000);
        await interaction.reply({ embeds: [embed] });
      } else {
        activeProfile = newProfile;
        console.log(`Admin changed the profile to "${newProfile}"`);
        const embed = new EmbedBuilder()
          .setTitle('Success')
          .setDescription(`Switched to "${newProfile}" profile.`)
          .setColor(0x00FF00);
        await interaction.reply({ embeds: [embed] });
      }
    }
  },
  {
    name: 'models',
    description: 'List available models',
    execute: async (interaction) => {
      if (interaction.user.id !== adminUserId) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('You do not have permission to use this command.')
          .setColor(0xFF0000);
        await interaction.reply({ embeds: [embed] });
        return;
      }

      const modelNames = Object.keys(models);
      const modelsList = modelNames.map(name => `* ${name}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('Available Models')
        .setDescription(modelsList)
        .setColor(0x00FF00);
      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    name: 'resethistory',
    description: 'Clear conversation history',
    execute: async (interaction) => {
      if (interaction.user.id !== adminUserId) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('You do not have permission to use this command.')
          .setColor(0xFF0000);
        await interaction.reply({ embeds: [embed] });
        return;
      }

      messageHistory = [];
      const embed = new EmbedBuilder()
        .setTitle('Success')
        .setDescription('All conversation history has been cleared.')
        .setColor(0x00FF00);
      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    name: 'help',
    description: 'Show help message',
    execute: async (interaction) => {
      const embed = new EmbedBuilder()
        .setTitle('Help')
        .setDescription('Available commands:')
        .addFields(
          { name: '/model <model_name>', value: 'Switch to a different model.' },
          { name: '/profile <profile_name>', value: 'Switch to a different profile.' },
          { name: '/models', value: 'List available models.' },
          { name: '/ask <question>', value: 'Ask a question.' },
          { name: '/resethistory', value: 'Clear conversation history.' },
          { name: '/help', value: 'Show this help message.' }
        )
        .setColor(0x00FF00);
      await interaction.reply({ embeds: [embed] });
    }
  }
];

client.on('messageCreate', async (message) => {
  if (targetChannelIds.includes(message.channelId) && !message.author.bot) {
    await handleUserInput(message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = commands.find(c => c.name === interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const embed = new EmbedBuilder()
      .setTitle('Error')
      .setDescription('An error occurred while executing the command.')
      .setColor(0xFF0000);
    await interaction.reply({ embeds: [embed] });
  }
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    activities: [{ name: `the trees`, type: ActivityType.Watching }],
    status: 'dnd',
  });

  const commandData = commands.map(c => {
    const commandBuilder = new SlashCommandBuilder()
      .setName(c.name)
      .setDescription(c.description);

    if (c.options) {
      c.options.forEach(option => {
        commandBuilder.addStringOption(opt => opt
          .setName(option.name)
          .setDescription(option.description)
          .setRequired(option.required));
      });
    }

    const json = commandBuilder.toJSON();
    json.integration_types = [0, 1];
    json.contexts = [0, 1, 2];

    return json;
  });

  const rest = new REST({ version: '10' }).setToken(discordToken);
  const clientId = client.user.id;

  await rest.put(
    Routes.applicationCommands(clientId),
    { body: [] },
  );

  await rest.put(
    Routes.applicationCommands(clientId),
    { body: commandData },
  );

  console.log('Global slash commands registered!');
});

loadPhrasesData();
loadBannedUsers();
loadProfiles();
loadModels();

client.login(discordToken);