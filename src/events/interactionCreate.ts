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
          const guild = interaction.guild;
          if (!guild) {
            await interaction.reply({ content: 'لا يمكن العثور على الخادم.', flags: 64 });
            return;
          }
          // Collect eligible channels: text or announcement channels with send capability
          const channels = guild.channels.cache.filter((c) => {
            return (
              (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
              typeof (c as any).send === 'function'
            );
          });
          const channelArray = Array.from(channels.values());
          if (channelArray.length === 0) {
            await interaction.reply({ content: 'لا توجد قنوات نصية متاحة لنشر الإعلان.', flags: 64 });
            return;
          }
          // Helper to build a paginated response with select menu and navigation buttons
          const buildPageComponents = (page: number) => {
            const MAX_OPTIONS = 25;
            const totalPages = Math.ceil(channelArray.length / MAX_OPTIONS);
            // Clamp page within bounds
            const currentPage = Math.max(0, Math.min(page, totalPages - 1));
            const start = currentPage * MAX_OPTIONS;
            const end = start + MAX_OPTIONS;
            const pageChannels = channelArray.slice(start, end);
            const menuOptions = pageChannels.map((ch) => ({
              label: `#${ch.name}`,
              value: ch.id,
            }));
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId(`announce-select-${messageId}-${authorId}`)
              .setPlaceholder('اختر القناة لنشر الإعلان')
              .addOptions(menuOptions);
            const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
            // Navigation buttons
            const navRow = new ActionRowBuilder<ButtonBuilder>();
            const prevButton = new ButtonBuilder()
              .setCustomId(`announce-page-prev-${messageId}-${authorId}-${currentPage}`)
              .setLabel('السابق')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === 0);
            const nextButton = new ButtonBuilder()
              .setCustomId(`announce-page-next-${messageId}-${authorId}-${currentPage}`)
              .setLabel('التالى')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage >= totalPages - 1);
            navRow.addComponents(prevButton, nextButton);
            return { selectRow, navRow };
          };
          // Build components for the first page (0)
          const { selectRow, navRow } = buildPageComponents(0);
          await interaction.reply({
            content: 'اختر القناة التى تريد نشر الإعلان فيها:',
            components: [selectRow, navRow],
            flags: 64,
          });
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
          // Include sticker IDs if the original message contains stickers. Only up to 3 stickers are allowed per message.
          try {
            const stickersCollection: any = (originalMessage as any).stickers;
            if (stickersCollection && Array.isArray(stickersCollection) ? stickersCollection.length > 0 : stickersCollection?.size > 0) {
              // Normalise to array of IDs regardless of collection shape
              const stickerArray = Array.isArray(stickersCollection)
                ? stickersCollection
                : Array.from(stickersCollection.values());
              const stickerIds = stickerArray
                .map((s: any) => (typeof s === 'string' ? s : s.id))
                .filter((id: any): id is string => typeof id === 'string');
              if (stickerIds.length > 0) {
                payload.sticker_ids = stickerIds.slice(0, 3);
              }
            }
          } catch (err) {
            // silently ignore sticker parsing issues
          }
          // Skip if there is nothing to send
          if (!payload.content && !payload.embeds && files.length === 0 && !('sticker_ids' in payload)) {
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

    // Handle pagination buttons for the announcement channel selection
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('announce-page-')) {
        const parts = customId.split('-');
        // Expected format: announce-page-(prev|next)-messageId-userId-currentPage
        const direction = parts[2];
        const messageId = parts[3];
        const authorId = parts[4];
        const currentPage = parseInt(parts[5], 10);
        if (!messageId || !authorId || Number.isNaN(currentPage)) {
          await interaction.reply({ content: 'المعرف غير صالح.', flags: 64 });
          return;
        }
        // Ensure only the original author can interact
        if (interaction.user.id !== authorId) {
          await interaction.reply({ content: 'غير مسموح لك بتنفيذ هذا الإجراء.', flags: 64 });
          return;
        }
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({ content: 'حدث خطأ فى الخادم.', flags: 64 });
          return;
        }
        // Collect eligible channels again on demand
        const channels = guild.channels.cache.filter((c) => {
          return (
            (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
            typeof (c as any).send === 'function'
          );
        });
        const channelArray = Array.from(channels.values());
        const MAX_OPTIONS = 25;
        const totalPages = Math.ceil(channelArray.length / MAX_OPTIONS);
        // Determine new page index
        let newPage = currentPage;
        if (direction === 'next') {
          newPage = Math.min(currentPage + 1, totalPages - 1);
        } else if (direction === 'prev') {
          newPage = Math.max(currentPage - 1, 0);
        }
        const start = newPage * MAX_OPTIONS;
        const end = start + MAX_OPTIONS;
        const pageChannels = channelArray.slice(start, end);
        const menuOptions = pageChannels.map((ch) => ({
          label: `#${ch.name}`,
          value: ch.id,
        }));
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`announce-select-${messageId}-${authorId}`)
          .setPlaceholder('اختر القناة لنشر الإعلان')
          .addOptions(menuOptions);
        const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
        const prevButton = new ButtonBuilder()
          .setCustomId(`announce-page-prev-${messageId}-${authorId}-${newPage}`)
          .setLabel('السابق')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 0);
        const nextButton = new ButtonBuilder()
          .setCustomId(`announce-page-next-${messageId}-${authorId}-${newPage}`)
          .setLabel('التالى')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage >= totalPages - 1);
        const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton);
        // Update the existing selection prompt message
        await interaction.update({
          content: 'اختر القناة التى تريد نشر الإعلان فيها:',
          components: [selectRow, navRow],
        });
        return;
      }
    }
  },
};