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
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to kick').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the kick').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'User not found in this guild.', ephemeral: true });
      return;
    }
    try {
      await member.kick(reason);
      const embed = createBrandEmbed('Member Kicked', `${target.tag} has been kicked.\n**Reason:** ${reason}`);
      await interaction.reply({ embeds: [embed] });
      const logger = new Logger(interaction.client);
      await logger.send(embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to kick the member. Check my permissions.', ephermal: true });
    }
  },
};