#!/usr/bin/env node

/**
 * Script de test des webhooks Discord
 */

import dotenv from 'dotenv';
import { sendDiscordTest } from '../src/utils/discord-webhook.js';

dotenv.config();

async function testWebhooks() {
    console.log('🧪 === TEST WEBHOOKS DISCORD ===\n');

    // Test webhook principal
    console.log('📤 Test webhook principal (cartes)...');
    if (process.env.DISCORD_WEBHOOK_URL) {
        try {
            const result = await sendDiscordTest();
            if (result.success) {
                console.log('✅ Webhook principal : OK');
            } else {
                console.log('❌ Webhook principal : ÉCHEC');
                console.log('   Erreur:', result.error);
            }
        } catch (error) {
            console.log('❌ Webhook principal : ERREUR');
            console.log('   Erreur:', error.message);
        }
    } else {
        console.log('⚠️ Webhook principal : DISCORD_WEBHOOK_URL non configuré');
    }

    console.log('\n🎉 Test terminé');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node bin/test-webhooks.js

Options:
  --help, -h     Afficher cette aide

Ce script teste le webhook Discord configuré :
- DISCORD_WEBHOOK_URL (alertes Bot Remi)

Exemples:
  node bin/test-webhooks.js
  npm run test-webhooks
    `);
} else {
    testWebhooks();
}