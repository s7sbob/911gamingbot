import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file if present
dotenvConfig();

/**
 * Wrapper around process.env providing typed accessors for configuration.
 * All required variables throw an error if they are missing, prompting the
 * operator to correctly configure the bot before starting it.
 */
export class Env {
  /** Discord bot token used to authenticate with the Discord API */
  static get token(): string {
    const token = process.env.DISCORD_TOKEN;
    if (!token) throw new Error('DISCORD_TOKEN is not set in the environment');
    return token;
  }

  /** MongoDB URI; if undefined, the bot uses in‑memory storage */
  static get mongoUri(): string | undefined {
    return process.env.MONGODB_URI || undefined;
  }

  /** URL used to set the bot avatar on startup */
  static get avatarUrl(): string | undefined {
    return process.env.BOT_AVATAR_URL || undefined;
  }

  /** URL used to set the bot avatar on startup (alias for consistency) */
  static get botAvatarUrl(): string | undefined {
    return process.env.BOT_AVATAR_URL || undefined;
  }

  /** Verification role assigned on button click */
  static get verificationRoleId(): string {
    const id = process.env.VERIFICATION_ROLE_ID;
    if (!id) throw new Error('VERIFICATION_ROLE_ID is not set');
    return id;
  }

  /** Category for ticket channels */
  static get ticketCategoryId(): string {
    const id = process.env.TICKET_CATEGORY_ID;
    if (!id) throw new Error('TICKET_CATEGORY_ID is not set');
    return id;
  }

  /** Role allowed to access ticket channels. Optional; if undefined, only the ticket creator and administrators can view tickets. */
  static get supportRoleId(): string | undefined {
    return process.env.SUPPORT_ROLE_ID || undefined;
  }

  /** Channel where moderation logs (kicks, bans, mutes) are sent */
  static get modLogChannelId(): string {
    const id = process.env.MODLOG_CHANNEL_ID;
    if (!id) throw new Error('MODLOG_CHANNEL_ID is not set');
    return id;
  }

  /** Channel where advertisements are published */
  static get adChannelId(): string {
    const id = process.env.AD_CHANNEL_ID;
    if (!id) throw new Error('AD_CHANNEL_ID is not set');
    return id;
  }

  /** Channel where ticket transcripts should be delivered */
  static get transcriptChannelId(): string {
    const id = process.env.TRANSCRIPT_CHANNEL_ID;
    if (!id) throw new Error('TRANSCRIPT_CHANNEL_ID is not set');
    return id;
  }

  /** Default music volume (0–100) */
  static get musicVolume(): number {
    const volume = Number(process.env.MUSIC_VOLUME || '50');
    if (Number.isNaN(volume) || volume < 0 || volume > 100) return 50;
    return volume;
  }

  /**
   * OAuth2 client ID used for authorising users to join the guild via the
   * `guilds.join` scope. Must be set if you enable the join commands.
   */
  static get oauthClientId(): string {
    const id = process.env.OAUTH_CLIENT_ID;
    if (!id) throw new Error('OAUTH_CLIENT_ID is not set');
    return id;
  }

  /**
   * OAuth2 client secret used when exchanging authorization codes for tokens.
   */
  static get oauthClientSecret(): string {
    const secret = process.env.OAUTH_CLIENT_SECRET;
    if (!secret) throw new Error('OAUTH_CLIENT_SECRET is not set');
    return secret;
  }

  /**
   * Redirect URI registered for your OAuth2 application. Users are redirected
   * here after authorising with Discord. Must exactly match the URI on the
   * application settings page.
   */
  static get oauthRedirectUri(): string {
    const uri = process.env.OAUTH_REDIRECT_URI;
    if (!uri) throw new Error('OAUTH_REDIRECT_URI is not set');
    return uri;
  }

  /**
   * Guild ID to which authorised users should be added. Your bot must already
   * be a member of this guild and have sufficient permissions (e.g. Manage
   * Guild) to add new members via the API.
   */
  static get targetGuildId(): string {
    const id = process.env.TARGET_GUILD_ID;
    if (!id) throw new Error('TARGET_GUILD_ID is not set');
    return id;
  }

  /**
   * Identifier of the channel where administrators can post announcement drafts.
   * Messages in this channel will be mirrored by the bot into the public
   * announcement channel defined below. This must be set to a valid
   * channel ID.
   */
  static get announcementSourceChannelId(): string {
    const id = process.env.ANNOUNCEMENT_SOURCE_CHANNEL_ID;
    if (!id) {
      throw new Error('ANNOUNCEMENT_SOURCE_CHANNEL_ID is not set');
    }
    return id;
  }

  /**
   * Identifier of the public announcements channel. The bot will repost
   * messages from the announcement source channel into this channel under
   * its own identity to conceal the original author. Must be set.
   */
  static get announcementChannelId(): string {
    const id = process.env.ANNOUNCEMENT_CHANNEL_ID;
    if (!id) {
      throw new Error('ANNOUNCEMENT_CHANNEL_ID is not set');
    }
    return id;
  }
}
