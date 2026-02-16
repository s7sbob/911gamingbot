import { Events, Client } from 'discord.js';
import { Env } from '../config/env';
// Note: Node 18+ provides a built‑in global fetch API, so no additional
// dependency is necessary. See https://nodejs.org/en/blog/announcements/v18-release#fetch-api

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    console.log(`Logged in as ${client.user?.tag}!`);
    // Set avatar if URL provided
    const avatarUrl = Env.avatarUrl;
    if (avatarUrl) {
      try {
        const response = await fetch(avatarUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        await client.user?.setAvatar(buffer);
        console.log('Bot avatar set successfully');
      } catch (error) {
        console.warn('Failed to set bot avatar:', error);
      }
    }
    // Register slash commands globally using application.commands.set
    const commands = (client as any).commands;
    try {
      await client.application?.commands.set(commands.map((cmd: any) => cmd.data));
      console.log('Application (/) commands registered globally');
    } catch (error) {
      console.error('Failed to register slash commands:', error);
    }
  },
};