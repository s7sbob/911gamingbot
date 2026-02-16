import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createBrandEmbed } from '../utils/embed';
import { Env } from '../config/env';

export default {
  data: new SlashCommandBuilder()
    .setName('setupverify')
    .setDescription('Post a verification panel with a button to assign the verification role')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction) {
    // Ensure this command is executed in a guild text channel
    if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({ content: 'This command can only be used in a guild text channel.', ephemeral: true });
      return;
    }
    // Create verification embed
    const embed = createBrandEmbed('Verification', 'Click the button below to verify yourself and gain access to the server.');
    const button = new ButtonBuilder()
      .setCustomId('verify-button')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    await interaction.reply({ embeds: [embed], components: [row] });
  },
};