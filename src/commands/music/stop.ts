import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue'),
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
    queue.stop();
    interaction.client.musicQueues.delete(guildId);
    await interaction.reply({ content: 'Stopped playback and cleared the queue.' });
  },
};