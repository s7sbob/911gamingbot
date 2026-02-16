import { Client, Collection, GatewayIntentBits, Partials, Events, Interaction } from 'discord.js';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import mongoose from 'mongoose';

import { Env } from './config/env';
import { Logger } from './utils/logger';
import { MusicQueue } from './utils/musicQueue';

// Create a new Discord client instance with required intents. Guilds intent
// allows slash commands; GuildMembers is needed for role assignment; Voice
// states are required for the music system.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

// Extend client with a commands collection and music queue storage
interface Command {
  data: any;
  execute: (interaction: Interaction) => Promise<any>;
  guildOnly?: boolean;
}

(client as any).commands = new Collection<string, Command>();

// Map of guildId to MusicQueue instance
(client as any).musicQueues = new Map<string, MusicQueue>();

// Load command modules
const commandsPath = join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);
for (const folder of commandFolders) {
  const folderPath = join(commandsPath, folder);
  const files = readdirSync(folderPath).filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
  for (const file of files) {
    const filePath = join(folderPath, file);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const command = require(filePath).default;
    if (command && command.data && command.execute) {
      (client as any).commands.set(command.data.name, command);
    } else {
      console.warn(`The command at ${filePath} is missing required properties.`);
    }
  }
}

// Load event modules
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const event = require(filePath).default;
  if (event && event.name) {
    if (event.once) {
      client.once(event.name, (...args: any[]) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args: any[]) => event.execute(...args, client));
    }
  }
}

// Connect to MongoDB if URI is provided
async function connectDatabase(): Promise<void> {
  const uri = Env.mongoUri;
  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
    }
  } else {
    console.log('MONGODB_URI not provided. Using in-memory storage where applicable.');
  }
}

// Login to Discord
async function start() {
  await connectDatabase();
  await client.login(Env.token);
}

start().catch((error) => {
  console.error('Failed to start bot:', error);
});