import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Env } from '../config/env';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the ticket system')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Post a ticket panel with a button to create tickets')
        .addStringOption((opt) =>
          opt.setName('message').setDescription('Optional panel description').setMaxLength(1000).setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a support ticket for yourself')
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Describe your issue').setRequired(false).setMaxLength(2000)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({ content: 'This command must be used in a guild text channel.', ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === 'panel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: 'You do not have permission to create a ticket panel.', ephemeral: true });
        return;
      }
      const description = interaction.options.getString('message') ??
        'Need assistance? Click the button below to open a support ticket and our staff will help you as soon as possible.';
      const embed = {
        title: 'Support Ticket',
        description,
        color: 0xff0000,
        footer: { text: '911 Gaming Store | Powered by 911GamingBot' },
      };
      const button = new ButtonBuilder()
        .setCustomId('open-ticket')
        .setLabel('Open Ticket')
        .setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
      await interaction.reply({ embeds: [embed], components: [row] });
    } else if (sub === 'create') {
      // Use the same logic as button open-ticket but triggered by command
      const guild = interaction.guild;
      const categoryId = Env.ticketCategoryId;
      const supportRoleId = Env.supportRoleId;
      const existing = guild.channels.cache.find(
        (c) => c.name.includes(interaction.user.id) && c.parentId === categoryId
      );
      if (existing) {
        await interaction.reply({ content: 'You already have an open ticket.', ephemeral: true });
        return;
      }
      const channelName = `ticket-${interaction.user.username.toLowerCase()}-${interaction.user.discriminator}`;
      try {
        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: 0,
          parent: categoryId,
          topic: `Ticket for ${interaction.user.tag} (${interaction.user.id})`,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: ['ViewChannel'],
            },
            {
              id: interaction.user.id,
              allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks'],
            },
            ...(supportRoleId
              ? [
                  {
                    id: supportRoleId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
                  },
                ]
              : []),
          ],
        });
        // Send initial message
        await ticketChannel.send({
          embeds: [
            {
              title: 'Support Ticket',
              description: `Hello ${interaction.user}, our staff will be with you shortly.\n\n**Reason:** ${interaction.options.getString('reason') || 'No reason provided.'}`,
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
        console.error(error);
        await interaction.reply({ content: 'Failed to create ticket channel.', ephemeral: true });
      }
    }
  },
};