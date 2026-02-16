import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the currently playing track'),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephermal: true });
      return;
    }
    const queue = interaction.client.musicQueues.get(guildId);
    if (!queue) {
      await interaction.reply({ content: 'There is nothing playing.', ephermal: true });
      return;
    }
    const skipped = await queue.skip();
    if (skipped) {
      await interaction.reply({ content: 'Skipped the current track.' });
    } else {
      await interaction.reply({ content: 'Nothing to skip.', ephermal: true });
    }
  },
};