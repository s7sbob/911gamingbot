import { Client, TextBasedChannel, Guild, EmbedBuilder } from 'discord.js';
import { Env } from '../config/env';

export class Logger {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  private async getModLogChannel(): Promise<TextBasedChannel> {
    const channel = await this.client.channels.fetch(Env.modLogChannelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Configured mod log channel is invalid or missing');
    }
    return channel;
  }

  async send(message: string | EmbedBuilder | { embeds: EmbedBuilder[] }): Promise<void> {
    const channel = await this.getModLogChannel();
    if ('send' in channel) {
      if (typeof message === 'string') {
        await channel.send({ content: message });
      } else if (message instanceof EmbedBuilder) {
        await channel.send({ embeds: [message] });
      } else {
        await channel.send(message);
      }
    }
  }
}
