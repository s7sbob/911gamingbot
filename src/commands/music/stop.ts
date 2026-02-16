import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      return;
    }
    const queue = (interaction.client as any).musicQueues?.get(guildId);
    if (!queue) {
      await interaction.reply({ content: 'There is nothing playing.', ephemeral: true });
      return;
    }
    queue.stop();
    (interaction.client as any).musicQueues.delete(guildId);
    await interaction.reply({ content: 'Stopped playback and cleared the queue.' });
  },
};
