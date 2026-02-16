import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import { createBrandEmbed } from '../../utils/embed';
import { Logger } from '../../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    try {
      await interaction.guild.members.ban(target.id, { reason });
      const embed = createBrandEmbed('Member Banned', `${target.tag} has been banned.\n**Reason:** ${reason}`);
      await interaction.reply({ embeds: [embed] });
      // Log to moderation channel
      const logger = new Logger(interaction.client);
      await logger.send(embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to ban the member. Do I have sufficient permissions?', ephemeral: true });
    }
  },
};