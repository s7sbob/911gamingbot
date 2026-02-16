import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Env } from '../config/env';

/**
 * Completes the guild join process by exchanging an OAuth2 code for an
 * access token, retrieving the user's ID, and adding the user to the
 * configured guild. The user must have previously authorised the
 * application via the link provided by the `/joinlink` command.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('joincomplete')
    .setDescription('Complete the join process using your OAuth2 code')
    .addStringOption((option) =>
      option
        .setName('code')
        .setDescription('OAuth2 code returned to your redirect URI')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const code = interaction.options.getString('code', true);
    try {
      // Exchange the authorization code for an access token
      const params = new URLSearchParams();
      params.set('client_id', Env.oauthClientId);
      params.set('client_secret', Env.oauthClientSecret);
      params.set('grant_type', 'authorization_code');
      params.set('code', code);
      params.set('redirect_uri', Env.oauthRedirectUri);
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const tokenData: any = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        await interaction.reply({ content: 'فشل الحصول على رمز الوصول. تأكد من صحة الكود والمحاولة مرة أخرى.', flags: 64 });
        return;
      }
      // Fetch the user's Discord ID using the access token
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData: any = await userRes.json();
      const userId = userData.id;
      if (!userId) {
        await interaction.reply({ content: 'تعذر الحصول على معرف المستخدم من Discord.', flags: 64 });
        return;
      }
      // Add the user to the target guild. Your bot must already be in the guild and have appropriate permissions.
      const guildId = Env.targetGuildId;
      const botToken = Env.token;
      const addRes = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      if (addRes.status === 201 || addRes.status === 204) {
        await interaction.reply({ content: 'تمت إضافتك إلى الخادم بنجاح!', flags: 64 });
      } else {
        const bodyText = await addRes.text();
        console.error('Failed to add user to guild:', addRes.status, bodyText);
        await interaction.reply({ content: 'فشلت عملية الإضافة. تأكد من أن البوت موجود فى الخادم ويملك الصلاحيات الكافية.', flags: 64 });
      }
    } catch (err) {
      console.error('Error completing join:', err);
      await interaction.reply({ content: 'حدث خطأ أثناء محاولة إتمام الانضمام.', flags: 64 });
    }
  },
};