import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause the currently playing track'),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      return;
    }
    const queue = (interaction.client as any).musicQueues?.get(guildId);
    if (!queue) {
      await interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
      return;
    }
    const paused = queue.pause();
    if (paused) {
      await interaction.reply({ content: 'Paused playback.' });
    } else {
      await interaction.reply({ content: 'Failed to pause. Are you sure something is playing?', ephemeral: true });
    }
  },
};
