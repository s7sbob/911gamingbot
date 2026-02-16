import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Env } from '../config/env';

/**
 * Provides a link that users can click to authorise the application with
 * the `identify` and `guilds.join` scopes. After authorising, users will
 * receive an OAuth2 code which can be submitted to the bot via the
 * `/joincomplete` command to complete the join process.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('joinlink')
    .setDescription('Get an OAuth2 link to authorise and join the server'),
  async execute(interaction: ChatInputCommandInteraction) {
    // Construct the authorisation URL. We URL‑encode the scopes and redirect
    // URI to ensure proper formatting. The `prompt=consent` parameter
    // forces Discord to show the consent screen each time.
    const clientId = Env.oauthClientId;
    const redirectUri = encodeURIComponent(Env.oauthRedirectUri);
    const scopes = encodeURIComponent('identify guilds.join');
    const url = `https://discord.com/oauth2/authorize?response_type=code&client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&prompt=consent`;
    await interaction.reply({
      content: `اضغط على الرابط التالى للموافقة على الصلاحيات والانضمام للخادم:\n${url}`,
      flags: 64,
    });
  },
};