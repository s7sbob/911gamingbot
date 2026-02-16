import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { Env } from '../config/env';
import { createBrandEmbed } from '../utils/embed';

export default {
  data: new SlashCommandBuilder()
    .setName('ad')
    .setDescription('Post an advertisement to the configured advertisement channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName('title').setDescription('Title of the advertisement').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('description').setDescription('Description/body of the advertisement').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('image').setDescription('URL of an image to display').setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName('ping').setDescription('Whether to @everyone in the ad channel').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'This command must be used within a guild.', ephemeral: true });
      return;
    }
    const adChannelId = Env.adChannelId;
    const channel = await interaction.client.channels.fetch(adChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: 'The advertisement channel configured is invalid.', ephemeral: true });
      return;
    }
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const image = interaction.options.getString('image');
    const ping = interaction.options.getBoolean('ping') ?? false;
    const embed = createBrandEmbed(title, description);
    if (image) embed.setImage(image);
    try {
      if ('send' in channel) {
        if (ping) {
          await channel.send({ content: '@everyone', embeds: [embed] });
        } else {
          await channel.send({ embeds: [embed] });
        }
      }
      await interaction.reply({ content: 'Advertisement posted successfully!', ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to send advertisement.', ephemeral: true });
    }
  },
};
