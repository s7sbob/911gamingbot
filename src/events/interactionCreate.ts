import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Events,
  Interaction,
  StringSelectMenuBuilder,
} from 'discord.js';
import { Env } from '../config/env';
import VerifiedUser from '../models/verifiedUser';

/**
 * Handles various interaction events from Discord including slash commands,
 * verification button clicks, and our custom announcement publication
 * workflow. When an admin posts a draft announcement, they are prompted
 * with buttons asking whether to publish it. If they confirm, they are
 * shown a select menu listing eligible text and announcement channels in
 * the guild. Selecting a channel causes the bot to repost the draft
 * message into the chosen channel while preserving embeds and attachments.
 */
export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: any) {
    // Slash commands are executed by their respective command handlers
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        const replyPayload = {
          content: 'There was an error while executing this command!',
          flags: 64, // use flags instead of deprecated `ephemeral`
        } as any;
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload);
        } else {
          await interaction.reply(replyPayload);
        }
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;
      // Verification button assigns the verification role
      if (customId === 'verify-button') {
        const guild = interaction.guild;
        if (!guild) return;
        const roleId = Env.verificationRoleId;
        const member = await guild.members.fetch(interaction.user.id);
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId);
          await interaction.reply({ content: 'تم التحقق من حسابك!', flags: 64 });
        } else {
          await interaction.reply({ content: 'أنت مُتحقق بالفعل.', flags: 64 });
        }
        // Record verification in database if configured
        try {
          await VerifiedUser.findOneAndUpdate(
            { userId: interaction.user.id },
            { userId: interaction.user.id, verifiedAt: new Date() },
            { upsert: true, new: true },
          ).exec();
        } catch (err) {
          console.error('Failed to record verified user:', err);
        }
        return;
      }

      // Ticket system buttons are disabled on this bot
      if (customId === 'open-ticket' || customId.startsWith('close-ticket')) {
        await interaction.reply({ content: 'نظام التذاكر معطل فى هذا البوت. يرجى استخدام بوت التذاكر المخصص.', flags: 64 }).catch(() => {});
        return;
      }

      // Announcement publication workflow
      if (customId.startsWith('announce-publish-') || customId.startsWith('announce-cancel-')) {
        const parts = customId.split('-');
        // Expected format: announce-publish-messageId-userId OR announce-cancel-messageId-userId
        const action = parts[1];
        const messageId = parts[2];
        const authorId = parts[3];
        if (!messageId || !authorId) {
          await interaction.reply({ content: 'المعرف غير صالح.', flags: 64 });
          return;
        }
        // Ensure only the original author can interact
        if (interaction.user.id !== authorId) {
          await interaction.reply({ content: 'غير مسموح لك بتنفيذ هذا الإجراء.', flags: 64 });
          return;
        }
        if (action === 'publish') {
          // Present a dropdown menu listing available channels where announcements can be posted.
          const guild = interaction.guild;
          if (!guild) {
            await interaction.reply({ content: 'لا يمكن العثور على الخادم.', flags: 64 });
            return;
          }
          // Collect channels that support text-based messages (GuildText or GuildAnnouncement) and are viewable by the user
          const channels = guild.channels.cache.filter((c) => {
            return (
              (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
              typeof (c as any).send === 'function'
            );
          });
          const options = [] as any[];
          // Limit to the first 25 channels (Discord select menus cannot exceed 25 options)
          for (const channel of channels.values()) {
            if (options.length >= 25) break;
            options.push({
              label: `#${channel.name}`,
              value: channel.id,
            });
          }
          if (options.length === 0) {
            await interaction.reply({ content: 'لا توجد قنوات نصية متاحة لنشر الإعلان.', flags: 64 });
            return;
          }
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`announce-select-${messageId}-${authorId}`)
            .setPlaceholder('اختر القناة لنشر الإعلان')
            .addOptions(options);
          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
          await interaction.reply({ content: 'اختر القناة التى تريد نشر الإعلان فيها:', components: [row], flags: 64 });
        } else if (action === 'cancel') {
          await interaction.reply({ content: 'تم إلغاء نشر الإعلان.', flags: 64 });
        }
        return;
      }
    }

    // Handle select menu interactions for announcement publication
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      if (customId.startsWith('announce-select-')) {
        const parts = customId.split('-');
        // Expected format: announce-select-messageId-userId
        const messageId = parts[2];
        const authorId = parts[3];
        if (!messageId || !authorId) {
          await interaction.reply({ content: 'المعرف غير صالح.', flags: 64 });
          return;
        }
        if (interaction.user.id !== authorId) {
          await interaction.reply({ content: 'غير مسموح لك بتنفيذ هذا الإجراء.', flags: 64 });
          return;
        }
        const selectedChannelId = interaction.values[0];
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({ content: 'حدث خطأ فى الخادم.', flags: 64 });
          return;
        }
        try {
          // Fetch the draft message from the source channel
          const sourceChannelId = Env.announcementSourceChannelId;
          const sourceChannel = await guild.channels.fetch(sourceChannelId);
          if (!sourceChannel || typeof (sourceChannel as any).messages?.fetch !== 'function') {
            await interaction.reply({ content: 'تعذر العثور على قناة مسودة الإعلان.', flags: 64 });
            return;
          }
          const originalMessage = await (sourceChannel as any).messages.fetch(messageId).catch(() => null);
          if (!originalMessage) {
            await interaction.reply({ content: 'تعذر العثور على الرسالة الأصلية.', flags: 64 });
            return;
          }
          // Construct the payload preserving content, embeds, and attachments
          const payload: any = {};
          if (originalMessage.content && originalMessage.content.trim().length > 0) {
            payload.content = originalMessage.content;
          }
          if (originalMessage.embeds && originalMessage.embeds.length > 0) {
            payload.embeds = originalMessage.embeds;
          }
          const files: { attachment: Buffer; name: string }[] = [];
          if (originalMessage.attachments && originalMessage.attachments.size > 0) {
            for (const attachment of originalMessage.attachments.values()) {
              try {
                const response = await fetch(attachment.url);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                files.push({ attachment: buffer, name: attachment.name ?? 'file' });
              } catch (err) {
                console.error('Failed to download attachment for announcement:', err);
              }
            }
          }
          if (files.length > 0) payload.files = files;
          // Skip if there is nothing to send
          if (!payload.content && !payload.embeds && files.length === 0) {
            await interaction.reply({ content: 'لا يمكن إرسال رسالة فارغة.', flags: 64 });
            return;
          }
          // Send to the selected channel
          const targetChannel = await guild.channels.fetch(selectedChannelId).catch(() => null);
          if (!targetChannel || typeof (targetChannel as any).send !== 'function') {
            await interaction.reply({ content: 'القناة المحددة غير صالحة لنشر الرسائل.', flags: 64 });
            return;
          }
          await (targetChannel as any).send(payload);
          await interaction.reply({ content: 'تم نشر الإعلان بنجاح!', flags: 64 });
        } catch (err) {
          console.error('Failed to post announcement:', err);
          await interaction.reply({ content: 'حدث خطأ أثناء نشر الإعلان.', flags: 64 });
        }
        return;
      }
    }
  },
};