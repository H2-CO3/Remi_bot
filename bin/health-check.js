#!/usr/bin/env node

/**
 * Script de vérification santé du système Bot Remi
 * À exécuter quotidiennement pour s'assurer que tout fonctionne
 */

import dotenv from 'dotenv';
import { query, closePool } from '../config/database.js';
import { sendDiscordAlert } from '../src/utils/discord-webhook.js';

dotenv.config();

class HealthCheckService {
    constructor() {
        this.checks = [];
        this.errors = [];
        this.warnings = [];
    }

    async checkDatabase() {
        console.log('🔍 Vérification base de données...');
        
        try {
            // Test de connexion
            await query('SELECT 1');
            this.checks.push('✅ Connexion base de données OK');
            
            // Vérifier les cartes actives
            const activeCards = await query('SELECT COUNT(*) as count FROM card_references WHERE active = TRUE');
            const cardCount = activeCards[0].count;
            
            if (cardCount === 0) {
                this.warnings.push(`⚠️ Aucune carte active (${cardCount} cartes)`);
            } else {
                this.checks.push(`✅ ${cardCount} cartes actives`);
            }
            
            // Vérifier les alertes récentes (dernières 24h)
            const recentAlerts = await query(`
                SELECT COUNT(*) as count 
                FROM sent_alerts 
                WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);
            const alertCount = recentAlerts[0].count;
            this.checks.push(`✅ ${alertCount} alertes envoyées (24h)`);
            
            // Vérifier les logs de scraping récents
            const recentLogs = await query(`
                SELECT 
                    status, COUNT(*) as count
                FROM scraping_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY status
            `);
            
            for (const log of recentLogs) {
                if (log.status === 'error') {
                    this.warnings.push(`⚠️ ${log.count} erreurs de scraping (24h)`);
                } else {
                    this.checks.push(`✅ ${log.count} scraping ${log.status} (24h)`);
                }
            }
            
            // Vérifier la surveillance stock pour le 26/09/2025
            const stockMonitoring = await query(`
                SELECT COUNT(*) as count, 
                       SUM(CASE WHEN stock_status = 'in_stock' THEN 1 ELSE 0 END) as in_stock
                FROM stock_monitoring 
                WHERE active = TRUE
            `);
            
            if (stockMonitoring[0]) {
                const totalStock = stockMonitoring[0].count;
                const inStock = stockMonitoring[0].in_stock;
                
                if (totalStock > 0) {
                    this.checks.push(`✅ ${totalStock} produits surveillés (${inStock} en stock)`);
                    
                    if (inStock > 0) {
                        this.warnings.push(`📦 ${inStock} produit(s) en stock détecté(s) !`);
                    }
                }
            }
            
            return true;
            
        } catch (error) {
            this.errors.push(`❌ Erreur base de données: ${error.message}`);
            return false;
        }
    }

    async checkDiscord() {
        console.log('🔍 Vérification Discord webhook...');
        
        try {
            // Test rapide sans spam
            const testMessage = `🏥 Test santé Bot Remi - ${new Date().toLocaleString('fr-FR')}`;
            const originalDryRun = process.env.DRY_RUN;
            
            // Forcer le dry-run pour ce test
            process.env.DRY_RUN = 'true';
            const result = await sendDiscordAlert(testMessage);
            process.env.DRY_RUN = originalDryRun;
            
            if (result.success) {
                this.checks.push('✅ Discord webhook configuré');
            } else {
                this.errors.push(`❌ Discord webhook: ${result.error}`);
            }
            
            return result.success;
            
        } catch (error) {
            this.errors.push(`❌ Erreur Discord: ${error.message}`);
            return false;
        }
    }

    async checkFiles() {
        console.log('🔍 Vérification fichiers système...');
        
        try {
            // Vérifier les modules critiques
            try {
                await import('mysql2/promise');
                this.checks.push('✅ Module mysql2 OK');
            } catch (error) {
                this.errors.push('❌ Module mysql2 manquant');
            }
            
            try {
                await import('puppeteer');
                this.checks.push('✅ Module puppeteer OK');
            } catch (error) {
                this.errors.push('❌ Module puppeteer manquant');
            }
            
            // Vérifier les variables d'environnement
            const requiredEnvVars = [
                'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'
            ];
            
            for (const envVar of requiredEnvVars) {
                if (process.env[envVar]) {
                    this.checks.push(`✅ ${envVar} configuré`);
                } else {
                    this.errors.push(`❌ ${envVar} manquant`);
                }
            }
            
            // Discord webhook principal (optionnel mais recommandé)
            if (process.env.DISCORD_WEBHOOK_URL) {
                this.checks.push('✅ DISCORD_WEBHOOK_URL configuré');
            } else {
                this.warnings.push('⚠️ DISCORD_WEBHOOK_URL non configuré');
            }

            
            return this.errors.length === 0;
            
        } catch (error) {
            this.errors.push(`❌ Erreur vérification fichiers: ${error.message}`);
            return false;
        }
    }

    async checkSystemResources() {
        console.log('🔍 Vérification ressources système...');
        
        try {
            // Vérification mémoire
            const memUsage = process.memoryUsage();
            const memUsageMB = Math.round(memUsage.rss / 1024 / 1024);
            
            if (memUsageMB > 1000) {  // Plus de 1GB
                this.warnings.push(`⚠️ Utilisation mémoire élevée: ${memUsageMB}MB`);
            } else {
                this.checks.push(`✅ Utilisation mémoire: ${memUsageMB}MB`);
            }
            
            // Vérification Node.js version
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
            
            if (majorVersion >= 16) {
                this.checks.push(`✅ Node.js ${nodeVersion}`);
            } else {
                this.warnings.push(`⚠️ Node.js ${nodeVersion} (recommandé: >= 16)`);
            }
            
            return true;
            
        } catch (error) {
            this.errors.push(`❌ Erreur ressources: ${error.message}`);
            return false;
        }
    }

    generateReport() {
        const totalChecks = this.checks.length + this.errors.length + this.warnings.length;
        const healthScore = Math.round((this.checks.length / totalChecks) * 100);
        
        let status = '✅ SAIN';
        if (this.errors.length > 0) {
            status = '❌ CRITIQUE';
        } else if (this.warnings.length > 0) {
            status = '⚠️ ATTENTION';
        }
        
        return {
            status,
            healthScore,
            timestamp: new Date().toISOString(),
            checks: this.checks,
            warnings: this.warnings,
            errors: this.errors,
            summary: {
                totalChecks,
                checksOk: this.checks.length,
                warnings: this.warnings.length,
                errors: this.errors.length
            }
        };
    }

    async run() {
        console.log(`\n🏥 === VÉRIFICATION SANTÉ BOT REMI - ${new Date().toISOString()} ===`);
        
        try {
            const checks = await Promise.allSettled([
                this.checkDatabase(),
                this.checkDiscord(),
                this.checkFiles(),
                this.checkSystemResources()
            ]);
            
            const report = this.generateReport();
            
            // Afficher le rapport
            console.log(`\n📊 === RAPPORT DE SANTÉ ===`);
            console.log(`🏥 Status: ${report.status}`);
            console.log(`📈 Score: ${report.healthScore}%`);
            console.log('');
            
            if (report.checks.length > 0) {
                console.log('✅ VÉRIFICATIONS RÉUSSIES:');
                report.checks.forEach(check => console.log(`   ${check}`));
                console.log('');
            }
            
            if (report.warnings.length > 0) {
                console.log('⚠️ AVERTISSEMENTS:');
                report.warnings.forEach(warning => console.log(`   ${warning}`));
                console.log('');
            }
            
            if (report.errors.length > 0) {
                console.log('❌ ERREURS CRITIQUES:');
                report.errors.forEach(error => console.log(`   ${error}`));
                console.log('');
            }
            
            // Envoyer alerte Discord si problèmes critiques
            if (report.errors.length > 0) {
                const message = `🚨 **PROBLÈME CRITIQUE BOT REMI**\n\n` +
                              `❌ **${report.errors.length} erreur(s) critique(s)**\n` +
                              report.errors.map(e => `   ${e}`).join('\n') +
                              `\n\n📅 ${new Date().toLocaleString('fr-FR')}` +
                              `\n🔧 Intervention requise`;
                
                await sendDiscordAlert(message);
            } else if (report.warnings.length > 0 && process.argv.includes('--verbose')) {
                const message = `⚠️ **Bot Remi - Avertissements**\n\n` +
                              report.warnings.map(w => `   ${w}`).join('\n') +
                              `\n\n✅ Score santé: ${report.healthScore}%` +
                              `\n📅 ${new Date().toLocaleString('fr-FR')}`;
                
                await sendDiscordAlert(message);
            }
            
            console.log('🎉 Vérification santé terminée');
            return report;
            
        } catch (error) {
            console.error('💥 Erreur fatale lors de la vérification:', error);
            
            await sendDiscordAlert(`💥 **ERREUR FATALE HEALTH CHECK**\n${error.message}\n📅 ${new Date().toLocaleString('fr-FR')}`);
            
            process.exit(1);
        } finally {
            await closePool();
        }
    }
}

// Fonction principale
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(`
Usage: node bin/health-check.js [options]

Options:
  --help, -h     Afficher cette aide
  --verbose      Envoyer les avertissements sur Discord
  --json         Sortie au format JSON

Exemples:
  node bin/health-check.js                    # Vérification normale
  node bin/health-check.js --verbose          # Avec alertes Discord pour warnings
  node bin/health-check.js --json             # Sortie JSON

Cron quotidien (9h):
  0 9 * * * cd /home/johnny/Documents/projet/bot_remi && node bin/health-check.js >> logs/health.log 2>&1
        `);
        return;
    }
    
    const healthCheck = new HealthCheckService();
    const report = await healthCheck.run();
    
    // Sortie JSON si demandée
    if (process.argv.includes('--json')) {
        console.log(JSON.stringify(report, null, 2));
    }
}

// Gestion des signaux
process.on('SIGTERM', async () => {
    console.log('\n⚠️ Arrêt du health check...');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n⚠️ Interruption du health check...');
    await closePool();
    process.exit(0);
});

// Exécution
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}