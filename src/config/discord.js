export const DISCORD_CONFIG = {
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
  enabled: process.env.DISCORD_ENABLED === "true",
  mention: process.env.DISCORD_MENTION || "",
  embeds: {
    color: 0x00ff00,
    title: "🎴 Bonne affaire détectée !",
    footer: {
      text: "Bot Scraper Pokemon"
    }
  }
};