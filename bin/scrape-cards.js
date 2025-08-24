#!/usr/bin/env node

/**
 * Script CLI pour le scraping automatique de cartes Pokemon
 * Utilisable par cron job pour surveillance continue
 * 
 * Usage:
 *   node bin/scrape-cards.js                    - Scraping normal
 *   node bin/scrape-cards.js --dry-run         - Mode test sans Discord/BDD
 *   node bin/scrape-cards.js --summary         - Affichage résumé
 */

import dotenv from 'dotenv';
import { closePool } from '../config/database.js';
import { AutoScrapingService } from '../src/services/auto-scraping-service.js';

dotenv.config();

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    const showSummary = process.argv.includes('--summary');
    
    console.log('🤖 Bot Remi - Scraping CLI');
    console.log('==========================');
    
    if (isDryRun) {
        console.log('🧪 Mode DRY-RUN activé (pas d\'alertes Discord)');
        process.env.DRY_RUN = 'true';
    }
    
    const service = new AutoScrapingService();
    
    try {
        // Lancer le scraping de toutes les cartes actives
        const result = await service.scrapeAllCards((progress) => {
            // Affichage optionnel des progrès
            if (showSummary && progress.type === 'card-complete') {
                console.log(`✅ ${progress.cardName}: ${progress.newAlerts} alertes`);
            }
        });
        
        // Affichage du résumé final
        console.log('\n📊 RÉSUMÉ FINAL:');
        console.log(`   - Cartes scannées: ${result.summary.totalCards}`);
        console.log(`   - Nouvelles alertes: ${result.summary.totalAlerts}`);
        console.log(`   - Résultats totaux: ${result.summary.totalResults}`);
        console.log(`   - Temps d'exécution: ${result.summary.executionTime}s`);
        
        if (isDryRun) {
            console.log('\n💡 Mode DRY-RUN: Aucune alerte Discord envoyée');
        }
        
        // Nettoyage
        await service.cleanup();
        
        console.log('\n✅ Scraping terminé avec succès');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Erreur critique:', error);
        
        try {
            await service.cleanup();
        } catch (cleanupError) {
            console.error('⚠️ Erreur nettoyage:', cleanupError.message);
        }
        
        process.exit(1);
        
    } finally {
        // Fermer la connexion BDD
        try {
            await closePool();
        } catch (error) {
            console.warn('⚠️ Erreur fermeture BDD:', error.message);
        }
    }
}

// Gestion propre des signaux système
process.on('SIGINT', async () => {
    console.log('\n🛑 Interruption détectée, nettoyage en cours...');
    try {
        await closePool();
    } catch (error) {
        console.error('Erreur lors du nettoyage:', error);
    }
    process.exit(1);
});

// Gestion des erreurs non catchées
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Erreur non gérée:', reason);
    process.exit(1);
});

// Lancer le script
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}