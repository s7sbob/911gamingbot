import { Events, Interaction, ButtonInteraction, ChatInputCommandInteraction, GuildMemberRoleManager, ChannelType, PermissionFlagsBits } from 'discord.js';
import { Env } from '../config/env';
import * as discordTranscripts from 'discord-html-transcripts';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: any) {
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
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      }
    } else if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId === 'verify-button') {
        const guild = interaction.guild;
        if (!guild) return;
        const roleId = Env.verificationRoleId;
        const member = await guild.members.fetch(interaction.user.id);
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId);
          await interaction.reply({ content: 'You have been verified!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'You are already verified.', ephemeral: true });
        }
      } else if (customId.startsWith('close-ticket')) {
        const channel = interaction.channel;
        const guild = interaction.guild;
        if (!channel || !guild || !channel.isTextBased()) {
          return;
        }
        await interaction.reply({ content: 'Closing ticket... please wait.', ephemeral: true }).catch(() => {});
        try {
          const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1,
            returnType: 'buffer' as any,
            filename: `${'name' in channel ? channel.name : 'ticket'}.html`,
            poweredBy: false,
          });
          const transcriptChannel = await client.channels.fetch(Env.transcriptChannelId);
          if (transcriptChannel && transcriptChannel.isTextBased() && 'send' in transcriptChannel) {
            await transcriptChannel.send({ 
              content: `Transcript for ${'name' in channel ? channel.name : 'ticket'}`, 
              files: [{ attachment, name: `${'name' in channel ? channel.name : 'ticket'}.html` }] 
            });
          }
          await interaction.editReply({ content: 'Ticket closed. Transcript saved.' }).catch(() => {});
        } catch (err) {
          console.error('Failed to generate transcript:', err);
          try {
            await interaction.editReply({ content: 'Ticket closed but failed to generate transcript.' });
          } catch {}
        }
        setTimeout(() => {
          channel.delete().catch(() => {});
        }, 3000);
      } else if (customId === 'open-ticket') {
        const guild = interaction.guild;
        if (!guild) return;
        const categoryId = Env.ticketCategoryId;
        const supportRoleId = Env.supportRoleId;
        const existing = guild.channels.cache.find((c) => c.name.includes(interaction.user.id) && c.parentId === categoryId);
        if (existing) {
          await interaction.reply({ content: 'You already have an open ticket.', ephemeral: true });
          return;
        }
        const channelName = `ticket-${interaction.user.username.toLowerCase()}-${interaction.user.discriminator}`;
        try {
          const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryId,
            topic: `Ticket for ${interaction.user.tag} (${interaction.user.id})`,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
              },
              ...(supportRoleId
                ? [
                    {
                      id: supportRoleId,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
                    },
                  ]
                : []),
            ],
          });
          await ticketChannel.send({
            embeds: [
              {
                title: 'Support Ticket',
                description: `Hello ${interaction.user}, a member of our staff will be with you shortly. Please describe your issue in detail.`,
                color: 0xff0000,
                footer: { text: '911 Gaming Store | Powered by 911GamingBot' },
              },
            ],
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 4,
                    label: 'Close Ticket',
                    custom_id: `close-ticket-${interaction.id}`,
                  },
                ],
              },
            ],
          });
          await interaction.reply({ content: `Your ticket has been created: ${ticketChannel}`, ephemeral: true });
        } catch (error) {
          console.error('Failed to create ticket:', error);
          await interaction.reply({ content: 'Failed to create ticket. Please contact staff.', ephemeral: true });
        }
      }
    }
  },
};
