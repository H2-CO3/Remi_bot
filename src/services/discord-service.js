import axios from 'axios';
import { DISCORD_CONFIG } from '../config/discord.js';

export class DiscordService {
  constructor() {
    this.config = DISCORD_CONFIG;
  }

  async sendBargainAlert(result, maxPrice) {
    if (!this.config.enabled || !this.config.webhookUrl) {
      console.log('Discord alerts disabled or webhook URL not configured');
      return;
    }

    try {
      const savings = maxPrice - result.price;
      const savingsPercent = ((savings / maxPrice) * 100).toFixed(1);
      
      const embed = {
        color: this.config.embeds.color,
        title: this.config.embeds.title,
        description: `Une bonne affaire a été trouvée sur **${result.site}** !`,
        fields: [
          {
            name: "🎴 Carte",
            value: result.title,
            inline: true
          },
          {
            name: "💰 Prix",
            value: result.priceText,
            inline: true
          },
          {
            name: "📊 Économies",
            value: `${savings.toFixed(2)}€ (-${savingsPercent}%)`,
            inline: true
          },
          {
            name: "🔗 Lien",
            value: `[Voir l'annonce](${result.link})`,
            inline: false
          }
        ],
        footer: {
          text: this.config.embeds.footer.text,
          icon_url: result.image || undefined
        },
        timestamp: new Date().toISOString(),
        thumbnail: {
          url: result.image || undefined
        }
      };

      const payload = {
        content: this.config.mention ? `${this.config.mention} 🔥` : undefined,
        embeds: [embed]
      };

      await axios.post(this.config.webhookUrl, payload);
      console.log(`📢 Discord alert sent for: ${result.title}`);
      
    } catch (error) {
      console.error('Error sending Discord alert:', error.message);
    }
  }

  async sendTestMessage() {
    if (!this.config.enabled || !this.config.webhookUrl) {
      console.log('Discord alerts disabled or webhook URL not configured');
      return false;
    }

    try {
      const embed = {
        color: 0x00ff00,
        title: "🧪 Test du Bot Scraper",
        description: "Le bot fonctionne correctement !",
        timestamp: new Date().toISOString(),
        footer: {
          text: this.config.embeds.footer.text
        }
      };

      await axios.post(this.config.webhookUrl, { embeds: [embed] });
      console.log('✅ Discord test message sent');
      return true;
      
    } catch (error) {
      console.error('❌ Error sending Discord test message:', error.message);
      return false;
    }
  }

  async sendCustomMessage(message) {
    if (!this.config.enabled || !this.config.webhookUrl) {
      console.log('Discord alerts disabled or webhook URL not configured');
      return false;
    }

    try {
      const payload = {
        content: message
      };

      await axios.post(this.config.webhookUrl, payload);
      console.log(`✅ Discord custom message sent: ${message}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error sending Discord custom message:', error.message);
      return false;
    }
  }
}