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
    // Post the verification panel. Use fetchReply to obtain the message so we
    // can pin it afterwards. Pinning ensures that new members can easily
    // locate the verification button when they join the server.
    await interaction.reply({ embeds: [embed], components: [row] });
    try {
      const message = await interaction.fetchReply();
      if (message && 'pin' in message && typeof (message as any).pin === 'function') {
        await (message as any).pin();
      }
    } catch (err) {
      console.warn('Failed to pin verification message:', err);
    }
  },
};