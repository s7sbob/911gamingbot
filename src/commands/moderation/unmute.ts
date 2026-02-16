import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} from 'discord.js';
import { createBrandEmbed } from '../../utils/embed';
import { Logger } from '../../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout (mute) from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to unmute').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      return;
    }
    const user = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'Member not found.', ephemeral: true });
      return;
    }
    try {
      await member.timeout(null);
      const embed = createBrandEmbed('Member Unmuted', `${user.tag} has been unmuted.`);
      await interaction.reply({ embeds: [embed] });
      const logger = new Logger(interaction.client);
      await logger.send(embed);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to unmute the member. Check my permissions.', ephemeral: true });
    }
  },
};
