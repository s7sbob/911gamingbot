import { Client, Collection, GatewayIntentBits, Partials, Events, Interaction } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import mongoose from 'mongoose';

import { Env } from './config/env';
import { Logger } from './utils/logger';
import { MusicQueue } from './utils/musicQueue';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    // Needed to read message content including emojis and mentions
    GatewayIntentBits.MessageContent,
    // Needed to access emoji and sticker data on messages
    GatewayIntentBits.GuildEmojisAndStickers,
  ],
  partials: [Partials.Channel],
});

interface Command {
  data: any;
  execute: (interaction: Interaction) => Promise<any>;
  guildOnly?: boolean;
}

(client as any).commands = new Collection<string, Command>();
(client as any).musicQueues = new Map<string, MusicQueue>();

// Load command modules recursively
const commandsPath = join(__dirname, 'commands');

function loadCommands(dir: string) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively load commands from subdirectories
      loadCommands(fullPath);
    } else if (stat.isFile() && (entry.endsWith('.js') || entry.endsWith('.ts'))) {
      // Load command file
      try {
        const command = require(fullPath).default;
        if (command && command.data && command.execute) {
          (client as any).commands.set(command.data.name, command);
          console.log(`✓ Loaded command: ${command.data.name}`);
        } else {
          console.warn(`⚠ The command at ${fullPath} is missing required properties.`);
        }
      } catch (error) {
        console.error(`✗ Failed to load command at ${fullPath}:`, error);
      }
    }
  }
}

loadCommands(commandsPath);

// Load event modules
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  try {
    const event = require(filePath).default;
    if (event && event.name) {
      if (event.once) {
        client.once(event.name, (...args: any[]) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args: any[]) => event.execute(...args, client));
      }
      console.log(`✓ Loaded event: ${event.name}`);
    }
  } catch (error) {
    console.error(`✗ Failed to load event at ${filePath}:`, error);
  }
}

// Connect to MongoDB if URI is provided
async function connectDatabase(): Promise<void> {
  const uri = Env.mongoUri;
  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log('✓ Connected to MongoDB');
    } catch (error) {
      console.error('✗ MongoDB connection error:', error);
    }
  } else {
    console.log('ℹ MONGODB_URI not provided. Using in-memory storage where applicable.');
  }
}

// Set bot avatar on ready
client.once(Events.ClientReady, async (c) => {
  console.log(`✓ Ready! Logged in as ${c.user.tag}`);
  
  if (Env.botAvatarUrl) {
    try {
      await c.user.setAvatar(Env.botAvatarUrl);
      console.log('✓ Bot avatar updated');
    } catch (error) {
      console.error('✗ Failed to set avatar:', error);
    }
  }
});

// Login to Discord
async function start() {
  await connectDatabase();
  await client.login(Env.token);
}

start().catch((error) => {
  console.error('✗ Failed to start bot:', error);
});
