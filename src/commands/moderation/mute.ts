import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} from 'discord.js';
import { createBrandEmbed } from '../../utils/embed';
import { Logger } from '../../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Temporarily mute a member using Discord\'s timeout feature')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to mute').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('minutes').setDescription('Duration of the mute in minutes').setMinValue(1).setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the mute').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephermal: true });
      return;
    }
    const user = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'Member not found.', ephermal: true });
      return;
    }
    try {
      const ms = minutes * 60 * 1000;
      await member.timeout(ms, reason);
      const embed = createBrandEmbed('Member Muted', `${user.tag} has been muted for ${minutes} minute(s).\n**Reason:** ${reason}`);
      await interaction.reply({ embeds: [embed] });
      const logger = new Logger(interaction.client);
      await logger.send(embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to mute the member. Check my permissions.', ephermal: true });
    }
  },
};