import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume the currently paused track'),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      return;
    }
    const queue = (interaction.client as any).musicQueues?.get(guildId);
    if (!queue) {
      await interaction.reply({ content: 'There is nothing to resume.', ephemeral: true });
      return;
    }
    const resumed = queue.resume();
    if (resumed) {
      await interaction.reply({ content: 'Resumed playback.' });
    } else {
      await interaction.reply({ content: 'Failed to resume. Are you sure it is paused?', ephemeral: true });
    }
  },
};
