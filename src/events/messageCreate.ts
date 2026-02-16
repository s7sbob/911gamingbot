import { Events, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Env } from '../config/env';

/**
 * This event handler listens for all new messages. When a message is sent
 * in the configured announcement source channel (where only administrators
 * should have permission to post), the bot will mirror that message into
 * the public announcement channel. After mirroring, the original message
 * is deleted to hide the admin's identity. Attachments are downloaded
 * and re‑uploaded so that images or files are preserved. Embeds are
 * forwarded as‑is.
 */
export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: any) {
    // Ignore bot messages and direct or system messages
    if (!message.guild || !message.author || message.author.bot) return;
    const sourceChannelId = Env.announcementSourceChannelId;
    if (!sourceChannelId) return;
    // Only react to messages in the configured announcement draft channel
    if (message.channel.id !== sourceChannelId) return;

    // Build an action row prompting the author whether to publish their message.
    // Each button embeds the message ID and author ID in its customId so we can
    // restrict interactions to the original author. We use Arabic labels to
    // match the language used by the server.
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`announce-publish-${message.id}-${message.author.id}`)
        .setLabel('نشر')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`announce-cancel-${message.id}-${message.author.id}`)
        .setLabel('إلغاء')
        .setStyle(ButtonStyle.Secondary)
    );

    try {
      await message.reply({
        content: 'هل تريد نشر هذه الرسالة؟',
        components: [row],
        allowedMentions: { repliedUser: false },
      });
    } catch (err) {
      console.error('Failed to prompt for announcement publication:', err);
    }
  },
};