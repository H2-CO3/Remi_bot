import { query } from '../../config/database.js';
import { UnifiedScrapingService } from './unified-scraping-service.js';
import { sendDiscordAlert } from '../utils/discord-webhook.js';

export class AutoScrapingService {
    constructor() {
        // Utiliser le service unifié en mode production (séquentiel avec délais complets)
        this.unifiedService = new UnifiedScrapingService({
            testMode: false,           // Mode production
            enableDelays: true,        // Délais anti-détection activés
            enableLogging: false       // Logging géré par ce service
        });
        
    }

    async getActiveCards() {
        const cards = await query(`
            SELECT id, name, reference, max_price 
            FROM card_references 
            WHERE active = TRUE 
            ORDER BY created_at DESC
        `);
        
        return cards;
    }

    // SYSTÈME UNIFIÉ : Anti-doublon par URL uniquement
    // Une annonce = une seule alerte, peu importe le contexte
    async isAlertAlreadySent(productLink) {
        const alerts = await query(`
            SELECT id 
            FROM sent_alerts 
            WHERE product_link = ?
        `, [productLink]);
        
        return alerts.length > 0;
    }

    async saveAlert(site, productLink, title, price) {
        try {
            await query(`
                INSERT INTO sent_alerts (site, product_link, title, price) 
                VALUES (?, ?, ?, ?)
            `, [site, productLink, title, parseFloat(price)]);
            
            return true;
        } catch (error) {
            // Ignore les erreurs de doublons (clé unique sur product_link)
            if (error.code === 'ER_DUP_ENTRY') {
                return false;
            }
            throw error;
        }
    }

    async logScraping(type, referenceId, site, status, resultsCount, errorMessage = null, executionTime = null) {
        await query(`
            INSERT INTO scraping_logs (type, reference_id, site, status, results_count, error_message, execution_time) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [type, referenceId, site, status, resultsCount, errorMessage, executionTime]);
    }

    // FONCTION MAÎTRE UNIFIÉE - TRAITEMENT TEMPS RÉEL
    async scrapeCard(searchTerm, maxPrice, progressCallback = null) {
        
        const startTime = Date.now();
        let totalNewAlerts = 0;
        let totalResults = 0;
        
        progressCallback?.({
            type: 'card-start',
            searchTerm: searchTerm,
            maxPrice: maxPrice,
            message: `🎯 Recherche: ${searchTerm}`
        });
        
        try {
            // RÉCUPÉRER LES SCRAPERS DIRECTEMENT
            const scrapers = this.unifiedService.scrapers;
            const sitesNames = Object.keys(scrapers);
            
            // SCRAPING SITE PAR SITE AVEC ALERTES TEMPS RÉEL
            for (const siteName of sitesNames) {
                const scraper = scrapers[siteName];
                let siteNewAlerts = 0;
                let siteResults = 0;
                
                progressCallback?.({
                    type: 'site-start',
                    site: siteName,
                    message: `🔍 Scraping ${siteName}...`
                });
                
                try {
                    
                    // SCRAPER LE SITE
                    console.log(`🔍 [AutoScraping] Starting scrape for ${siteName}`);
                    const rawResults = await scraper.scrape(searchTerm);
                    console.log(`✅ [AutoScraping] ${siteName} returned ${rawResults.length} results`);
                    
                    siteResults = rawResults.length;
                    totalResults += siteResults;
                    
                    if (rawResults.length === 0) {
                        await this.logScraping('card_scraping', null, siteName, 'no_results', 0, null, Date.now() - startTime);
                        
                        progressCallback?.({
                            type: 'site-no-results',
                            site: siteName,
                            message: `⚠️ Aucun résultat`
                        });
                        continue;
                    }
                    
                    // TRAITEMENT RÉSULTAT PAR RÉSULTAT - TEMPS RÉEL
                    console.log(`🔄 [AutoScraping] Processing ${rawResults.length} results for ${siteName}`);
                    for (const product of rawResults) {
                        console.log(`🔍 [AutoScraping] Processing:`, { title: product.title, price: product.price, link: product.link?.substring(0, 50) + '...' });
                        const price = parseFloat(product.price);
                        console.log(`💰 [AutoScraping] Parsed price: ${price} (original: ${product.price})`);
                        
                        // VÉRIFICATION PRIX
                        console.log(`🔍 [AutoScraping] Price check: ${price}€ vs max ${maxPrice}€`);
                        if (price <= maxPrice) {
                            console.log(`✅ [AutoScraping] Price OK! Checking anti-duplicate...`);
                            // VÉRIFICATION ANTI-DOUBLON
                            const alreadySent = await this.isAlertAlreadySent(product.link);
                            console.log(`🔍 [AutoScraping] Already sent check: ${alreadySent}`);
                            
                            if (!alreadySent) {
                                console.log(`🚨 [AutoScraping] SENDING ALERT for: ${product.title} - ${price}€`);
                                
                                // CALLBACK TEMPS RÉEL - ENVOI EN COURS
                                progressCallback?.({
                                    type: 'alert-sending',
                                    site: siteName,
                                    product: {
                                        title: product.title,
                                        price: price,
                                        link: product.link
                                    },
                                    message: `🚨 Envoi alerte: ${product.title} - ${price}€`
                                });
                                
                                // ENVOI ALERTE DISCORD IMMÉDIAT
                                const discordMessage = `🎯 **${searchTerm}** - ${price}€ (max: ${maxPrice}€)\n` +
                                                     `📱 **Site:** ${siteName}\n` +
                                                     `🔗 **Lien:** ${product.link}\n` +
                                                     `📝 **Titre:** ${product.title}`;
                                
                                await sendDiscordAlert(discordMessage);
                                
                                // SAUVEGARDE URL EN BASE POUR ANTI-DOUBLON
                                const saved = await this.saveAlert(siteName, product.link, product.title, price);
                                
                                if (saved) {
                                    siteNewAlerts++;
                                    totalNewAlerts++;
                                    
                                    // CALLBACK CONFIRMATION ALERTE ENVOYÉE
                                    progressCallback?.({
                                        type: 'alert-sent',
                                        site: siteName,
                                        product: {
                                            title: product.title,
                                            price: price,
                                            link: product.link
                                        },
                                        alertCount: totalNewAlerts,
                                        message: `✅ Alerte #${totalNewAlerts} envoyée`
                                    });
                                }
                                
                                // DÉLAI ANTI-RATE-LIMIT DISCORD
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                            } else {
                                console.log(`⚠️ [AutoScraping] Alert already sent for: ${product.link?.substring(0, 50)}...`);
                            }
                        } else {
                            console.log(`❌ [AutoScraping] Price too high: ${price}€ > ${maxPrice}€`);
                        }
                    }
                    
                    // LOG SUCCÈS SITE
                    await this.logScraping('card_scraping', null, siteName, 'success', siteResults, null, Date.now() - startTime);
                    
                    progressCallback?.({
                        type: 'site-success',
                        site: siteName,
                        newAlerts: siteNewAlerts,
                        totalFiltered: siteResults,
                        message: `✅ ${siteNewAlerts} nouvelles alertes`
                    });
                    
                    
                } catch (error) {
                    console.error(`❌ [AutoScraping] EXCEPTION in ${siteName}:`, error.message);
                    console.error(`❌ [AutoScraping] Stack trace:`, error.stack);
                    
                    await this.logScraping('card_scraping', null, siteName, 'error', 0, error.message, Date.now() - startTime);
                    
                    progressCallback?.({
                        type: 'site-error',
                        site: siteName,
                        error: error.message,
                        message: `❌ Erreur: ${error.message}`
                    });
                }
            }
            
            // CALLBACK FINAL
            progressCallback?.({
                type: 'card-complete',
                newAlerts: totalNewAlerts,
                totalResults: totalResults,
                message: `✅ ${totalNewAlerts} nouvelles alertes`
            });
            
            const executionTime = Math.round((Date.now() - startTime) / 1000);
            
            return {
                searchTerm: searchTerm,
                maxPrice: maxPrice,
                newAlerts: totalNewAlerts,
                totalResults: totalResults,
                executionTime: executionTime
            };
            
        } catch (error) {
            console.error(`❌ Erreur critique scraping "${searchTerm}":`, error.message);
            await this.logScraping('card_scraping', null, 'unified', 'error', 0, error.message, Date.now() - startTime);
            
            progressCallback?.({
                type: 'card-error',
                error: error.message,
                message: `❌ Erreur: ${error.message}`
            });
            
            throw error;
        }
    }

    // WRAPPER POUR COMPATIBILITÉ BDD - UTILISE LA FONCTION MAÎTRE
    async scrapeCardFromDatabase(card, progressCallback = null) {
        const searchQuery = `${card.name} ${card.reference}`;
        const result = await this.scrapeCard(searchQuery, card.max_price, progressCallback);
        
        // Adapter le format de retour pour compatibilité
        return {
            cardId: card.id,
            cardName: searchQuery,
            maxPrice: result.maxPrice,
            newAlerts: result.newAlerts,
            totalResults: result.totalResults
        };
    }

    // MÉTHODE POUR LES TESTS - UTILISE LA FONCTION MAÎTRE DIRECTEMENT
    async scrapeCardForTesting(searchQuery, maxPrice, progressCallback = null) {
        
        // Utiliser directement la fonction maître - MÊME LOGIQUE QUE PROD
        return await this.scrapeCard(searchQuery, parseFloat(maxPrice), progressCallback);
    }

    async scrapeAllCards(progressCallback = null) {
        const startTime = Date.now();
        
        try {
            const activeCards = await this.getActiveCards();
            
            if (activeCards.length === 0) {
                return {
                    cards: [],
                    summary: {
                        totalCards: 0,
                        totalAlerts: 0,
                        totalResults: 0,
                        executionTime: 0
                    }
                };
            }
            
            progressCallback?.({
                type: 'scraping-start',
                totalCards: activeCards.length,
                message: `🚀 Scraping de ${activeCards.length} cartes`
            });
            
            const results = [];
            let totalAlerts = 0;
            let totalResults = 0;
            
            // BOUCLE SUR TOUTES LES CARTES AVEC LA FONCTION MAÎTRE
            for (let i = 0; i < activeCards.length; i++) {
                const card = activeCards[i];
                const isLastCard = i === activeCards.length - 1;
                
                
                // UTILISER LA FONCTION MAÎTRE DIRECTEMENT
                const searchQuery = `${card.name} ${card.reference}`;
                const cardResult = await this.scrapeCard(searchQuery, card.max_price, progressCallback);
                
                // Adapter le format pour compatibilité
                const compatibleResult = {
                    cardId: card.id,
                    cardName: searchQuery,
                    maxPrice: card.max_price,
                    newAlerts: cardResult.newAlerts,
                    totalResults: cardResult.totalResults
                };
                
                results.push(compatibleResult);
                totalAlerts += cardResult.newAlerts;
                totalResults += cardResult.totalResults;
                
                // DÉLAI ENTRE CARTES POUR ÉVITER ACCUMULATION RATE LIMITS
                if (!isLastCard && cardResult.newAlerts > 0) {
                    const delayMs = Math.max(1000, cardResult.newAlerts * 600); // 600ms par alerte + 1s min
                    
                    progressCallback?.({
                        type: 'card-delay',
                        cardIndex: i + 1,
                        totalCards: activeCards.length,
                        delayMs: delayMs,
                        reason: `Délai anti-rate-limit (${cardResult.newAlerts} alertes)`,
                        message: `⏳ Pause ${delayMs}ms entre cartes`
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                } else if (!isLastCard) {
                    // Délai minimal même sans alertes
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            const executionTime = Math.round((Date.now() - startTime) / 1000);
            
            
            const summary = {
                totalCards: activeCards.length,
                totalAlerts: totalAlerts,
                totalResults: totalResults,
                executionTime: executionTime
            };
            
            progressCallback?.({
                type: 'scraping-complete',
                summary: summary,
                message: `✅ Terminé: ${totalAlerts} alertes en ${executionTime}s`
            });
            
            return {
                cards: results,
                summary: summary
            };
            
        } catch (error) {
            console.error('❌ Erreur critique dans le scraping BDD:', error);
            
            progressCallback?.({
                type: 'scraping-error',
                error: error.message,
                message: `❌ Erreur: ${error.message}`
            });
            
            throw error;
        }
    }

    async getScrapingHistory(limit = 50) {
        const logs = await query(`
            SELECT 
                sl.id, sl.type, sl.site, sl.status, sl.results_count, 
                sl.error_message, sl.execution_time, sl.created_at,
                cr.name as card_name, cr.reference as card_reference
            FROM scraping_logs sl
            LEFT JOIN card_references cr ON sl.reference_id = cr.id
            WHERE sl.type = 'card_scraping'
            ORDER BY sl.created_at DESC
            LIMIT ?
        `, [limit]);
        
        return logs;
    }

    async getAlertsHistory(limit = 100) {
        const alerts = await query(`
            SELECT 
                sa.id, sa.site, sa.product_link, sa.title, sa.price, sa.sent_at,
                cr.name as card_name, cr.reference as card_reference, cr.max_price
            FROM sent_alerts sa
            JOIN card_references cr ON sa.card_reference_id = cr.id
            ORDER BY sa.sent_at DESC
            LIMIT ?
        `, [limit]);
        
        return alerts;
    }

    async cleanup() {
        await this.unifiedService.cleanup();
    }
}