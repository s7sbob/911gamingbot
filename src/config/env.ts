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
}
