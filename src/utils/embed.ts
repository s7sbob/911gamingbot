import { EmbedBuilder, APIEmbedField } from 'discord.js';

/**
 * The default color used for all embeds. This color should represent
 * your brand. Feel free to change the hexadecimal value to better
 * match the 911 Gaming Store's identity.
 */
const DEFAULT_COLOR = 0xff0000; // Red to match "911" brand

/**
 * Creates a new branded embed builder. All embeds generated through this
 * helper automatically include a consistent color and footer. Additional
 * fields or properties can be applied to the returned instance.
 *
 * @param title Optional title for the embed.
 * @param description Optional description for the embed.
 */
export function createBrandEmbed(title?: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(DEFAULT_COLOR);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  embed.setFooter({
    text: '911 Gaming Store | Powered by 911GamingBot',
  });
  return embed;
}

/**
 * Convenience helper to convert an object into APIEmbedField[].
 * Accepts a record of key–value pairs and returns them as fields.
 * Useful when building dynamic embed content.
 */
export function objectToFields(record: Record<string, string>): APIEmbedField[] {
  return Object.entries(record).map(([name, value]) => ({ name, value, inline: false }));
}