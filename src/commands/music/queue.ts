import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('queue').setDescription('Show the current music queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      return;
    }
    const queue = (interaction.client as any).musicQueues?.get(guildId);
    if (!queue) {
      await interaction.reply({ content: 'The queue is empty.', ephemeral: true });
      return;
    }
    const tracks = queue.getQueue();
    if (tracks.length === 0) {
      await interaction.reply({ content: 'The queue is empty.', ephemeral: true });
      return;
    }
    const description = tracks
      .map((track: any, index: number) => `${index + 1}. **${track.title}**${track.duration ? ` (${track.duration})` : ''} — requested by ${track.requestedBy}`)
      .join('\n');
    await interaction.reply({ embeds: [ { title: 'Current Queue', description, color: 0xff0000, footer: { text: '911 Gaming Store | Powered by 911GamingBot' } } ] });
  },
};
