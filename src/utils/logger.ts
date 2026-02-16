import { Client, TextBasedChannel, Guild, EmbedBuilder } from 'discord.js';
import { Env } from '../config/env';

/**
 * Centralised logging utility for the bot. Use this helper to send
 * moderation logs or other notifications to the configured log channel.
 */
export class Logger {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Resolve the channel configured for moderation logs. Throws if the
   * channel cannot be found. This intentionally errs fast so misconfigured
   * installations are caught early.
   */
  private async getModLogChannel(): Promise<TextBasedChannel> {
    const channel = await this.client.channels.fetch(Env.modLogChannelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Configured mod log channel is invalid or missing');
    }
    return channel;
  }

  /**
   * Send a plain message to the moderation log channel.
   */
  async send(message: string | EmbedBuilder | { embeds: EmbedBuilder[] }): Promise<void> {
    const channel = await this.getModLogChannel();
    if (typeof message === 'string') {
      await channel.send({ content: message });
    } else if (message instanceof EmbedBuilder) {
      await channel.send({ embeds: [message] });
    } else {
      await channel.send(message);
    }
  }
}