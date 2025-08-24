import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendDiscordAlert(message) {
    // Mode dry-run pour les tests
    if (process.env.DRY_RUN === 'true') {
        console.log(`🧪 [DRY-RUN] Alerte Discord qui aurait été envoyée:`);
        console.log(message);
        console.log('');
        return { success: true, dryRun: true };
    }
    
    const webhookUrl = DISCORD_WEBHOOK_URL;
    const webhookType = 'DISCORD_WEBHOOK_URL';
    
    if (!webhookUrl) {
        console.warn(`⚠️ ${webhookType} non configurée - alerte ignorée`);
        console.log('💬 Message qui aurait été envoyé:', message);
        return { success: false, error: `Webhook URL ${webhookType} manquante` };
    }
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: message,
                username: 'Bot Remi Pokemon',
                avatar_url: 'https://cdn.discordapp.com/attachments/123/456/pokemon-ball.png'
            })
        });
        
        if (response.ok) {
            console.log(`📤 Alerte Discord envoyée avec succès`);
            return { success: true };
        } else {
            const errorText = await response.text();
            console.error(`❌ Erreur Discord webhook ${webhookType}:`, response.status, errorText);
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }
        
    } catch (error) {
        console.error(`❌ Erreur lors de l'envoi Discord ${webhookType}:`, error.message);
        return { success: false, error: error.message };
    }
}

export async function sendDiscordSummary(summary) {
    const message = `📊 **Résumé Scraping Automatique**
    
🎯 **Cartes scannées:** ${summary.totalCards}
🚨 **Nouvelles alertes:** ${summary.totalAlerts}  
📦 **Résultats trouvés:** ${summary.totalResults}
⏱️ **Temps d'exécution:** ${summary.executionTime}s

🤖 Bot Remi - ${new Date().toLocaleString('fr-FR')}`;

    return await sendDiscordAlert(message);
}

export async function sendDiscordError(error, context = '') {
    const message = `🚨 **ERREUR BOT REMI**

❌ **Erreur:** ${error.message}
🔍 **Contexte:** ${context}
📅 **Date:** ${new Date().toLocaleString('fr-FR')}

🛠️ Vérification manuelle recommandée`;

    return await sendDiscordAlert(message);
}


export async function sendDiscordTest() {
    const message = `🧪 **Test Discord Webhook**
    
✅ La connexion Discord fonctionne correctement
🤖 Bot Remi opérationnel
📅 ${new Date().toLocaleString('fr-FR')}`;

    return await sendDiscordAlert(message);
}

