import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { MusicQueue, Track } from '../../utils/musicQueue';
import { Env } from '../../config/env';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or add it to the queue')
    .addStringOption((option) =>
      option.setName('query').setDescription('YouTube or Spotify URL or search term').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephermal: true });
      return;
    }
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member || !member.voice.channel) {
      await interaction.reply({ content: 'You must be in a voice channel to use this command.', ephermal: true });
      return;
    }
    const query = interaction.options.getString('query', true);
    // Get or create queue for this guild
    let queue: MusicQueue = interaction.client.musicQueues.get(interaction.guildId);
    if (!queue) {
      queue = new MusicQueue(interaction.guild, Env.musicVolume);
      interaction.client.musicQueues.set(interaction.guildId, queue);
    }
    // Connect to voice channel if not already
    try {
      await queue.connect(member.voice.channel);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to join your voice channel.', ephermal: true });
      return;
    }
    await interaction.deferReply();
    try {
      const track = await Track.from(query, interaction.user.tag);
      await queue.enqueue(track);
      await interaction.editReply({ content: `Enqueued **${track.title}**${track.duration ? ` (${track.duration})` : ''}` });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Failed to load the track.' });
    }
  },
};