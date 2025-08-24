import { ScraperFactory } from '../factories/scraper-factory.js';
import { DelayManager } from '../utils/delay-manager.js';
import { PokemonFilter } from '../utils/pokemon-filter.js';
import { LoggerService } from './logger-service.js';

/**
 * Service de scraping unifié
 * Centralise la logique de scraping pour garantir la cohérence entre tous les contextes d'usage
 */
export class UnifiedScrapingService {
    constructor(options = {}) {
        // Création des scrapers via la factory
        this.scrapers = ScraperFactory.createScrapers();
        this.scrapersArray = Object.values(this.scrapers);
        
        // Gestionnaire de délais
        this.delayManager = new DelayManager({ 
            testMode: options.testMode || false 
        });
        
        // Logger optionnel
        this.logger = options.enableLogging ? new LoggerService() : null;
        
        // Configuration
        this.options = {
            enableDelays: options.enableDelays !== false, // true par défaut
            enableLogging: options.enableLogging || false,
            testMode: options.testMode || false,
            ...options
        };

    }

    /**
     * Scraping séquentiel pour production (anti-détection maximal)
     * Mode utilisé par AutoScrapingService
     */
    async scrapeSequential(searchTerms, progressCallback = null) {
        const allResults = [];
        const resultsBySite = {};

        // Initialiser les compteurs par site
        for (const siteName of Object.keys(this.scrapers)) {
            resultsBySite[siteName] = [];
        }

        progressCallback?.({
            type: 'scraping-start',
            mode: 'sequential',
            searchTerms: Array.isArray(searchTerms) ? searchTerms : [searchTerms],
            sitesCount: this.scrapersArray.length
        });

        const searchArray = Array.isArray(searchTerms) ? searchTerms : [searchTerms];

        for (let i = 0; i < searchArray.length; i++) {
            const searchTerm = searchArray[i];
            const isLastSearch = i === searchArray.length - 1;

            
            progressCallback?.({
                type: 'search-start',
                searchTerm: searchTerm,
                searchIndex: i + 1,
                totalSearches: searchArray.length
            });

            // Scraper chaque site séquentiellement pour ce terme
            for (const [siteName, scraper] of Object.entries(this.scrapers)) {
                try {
                    
                    progressCallback?.({
                        type: 'site-start',
                        site: siteName,
                        searchTerm: searchTerm
                    });

                    // Scraping du site
                    const rawResults = await scraper.scrape(searchTerm);

                    // Filtrage Pokemon
                    const filteredResults = PokemonFilter.filterResults(rawResults, searchTerm);

                    // Stocker les résultats
                    allResults.push(...filteredResults);
                    resultsBySite[siteName].push(...filteredResults);

                    // Log si activé
                    if (this.logger) {
                        for (const result of filteredResults) {
                            await this.logger.logResult(result);
                        }
                    }

                    progressCallback?.({
                        type: 'site-success',
                        site: siteName,
                        rawCount: rawResults.length,
                        filteredCount: filteredResults.length,
                        results: filteredResults
                    });

                    // Délai entre sites (sauf pour le dernier site de la dernière recherche)
                    if (this.options.enableDelays && !(isLastSearch && siteName === Object.keys(this.scrapers).pop())) {
                        await this.delayManager.waitAfterSite(siteName);
                    }

                } catch (error) {
                    console.error(`    ❌ Erreur ${siteName}:`, error.message);
                    
                    if (this.logger) {
                        await this.logger.logError(error, `Scraping ${siteName} pour "${searchTerm}"`);
                    }

                    progressCallback?.({
                        type: 'site-error',
                        site: siteName,
                        error: error.message,
                        searchTerm: searchTerm
                    });
                }
            }

            // Délai entre les recherches (sauf pour la dernière)
            if (this.options.enableDelays && !isLastSearch) {
                await this.delayManager.waitBetweenCards(
                    searchTerm, 
                    searchArray[i + 1] || ''
                );
            }
        }

        const finalResults = {
            allResults,
            resultsBySite,
            summary: {
                totalResults: allResults.length,
                sitesScraped: Object.keys(this.scrapers).length,
                searchTerms: searchArray.length,
                ...Object.fromEntries(
                    Object.entries(resultsBySite).map(([site, results]) => 
                        [`${site}Results`, results.length]
                    )
                )
            }
        };

        progressCallback?.({
            type: 'scraping-complete',
            mode: 'sequential',
            ...finalResults
        });


        return finalResults;
    }

    /**
     * Scraping parallèle pour tests rapides
     * Mode utilisé par l'interface de test
     */
    async scrapeParallel(searchTerm, progressCallback = null) {
        
        progressCallback?.({
            type: 'scraping-start',
            mode: 'parallel',
            searchTerm: searchTerm,
            sitesCount: this.scrapersArray.length
        });

        const promises = Object.entries(this.scrapers).map(async ([siteName, scraper]) => {
            try {
                progressCallback?.({
                    type: 'site-start',
                    site: siteName,
                    searchTerm: searchTerm
                });

                const rawResults = await scraper.scrape(searchTerm);

                const filteredResults = PokemonFilter.filterResults(rawResults, searchTerm);

                // Log si activé
                if (this.logger) {
                    for (const result of filteredResults) {
                        await this.logger.logResult(result);
                    }
                }

                progressCallback?.({
                    type: 'site-success',
                    site: siteName,
                    rawCount: rawResults.length,
                    filteredCount: filteredResults.length,
                    results: filteredResults
                });

                return { siteName, results: filteredResults, success: true };
                
            } catch (error) {
                console.error(`❌ Erreur ${siteName}:`, error.message);
                
                if (this.logger) {
                    await this.logger.logError(error, `Scraping ${siteName} pour "${searchTerm}"`);
                }

                progressCallback?.({
                    type: 'site-error',
                    site: siteName,
                    error: error.message,
                    searchTerm: searchTerm
                });

                return { siteName, results: [], success: false, error: error.message };
            }
        });

        const results = await Promise.allSettled(promises);
        
        // Traitement des résultats
        const allResults = [];
        const resultsBySite = {};
        
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const { siteName, results: siteResults } = result.value;
                allResults.push(...siteResults);
                resultsBySite[siteName] = siteResults;
            }
        }

        const finalResults = {
            allResults,
            resultsBySite,
            summary: {
                totalResults: allResults.length,
                sitesScraped: Object.keys(this.scrapers).length,
                searchTerms: 1,
                ...Object.fromEntries(
                    Object.entries(resultsBySite).map(([site, results]) => 
                        [`${site}Results`, results.length]
                    )
                )
            }
        };

        progressCallback?.({
            type: 'scraping-complete',
            mode: 'parallel',
            ...finalResults
        });


        return finalResults;
    }

    /**
     * Scraping d'un seul site
     */
    async scrapeSingle(siteName, searchTerm, progressCallback = null) {
        const scraper = this.scrapers[siteName.toLowerCase()];
        if (!scraper) {
            throw new Error(`Scraper non disponible pour: ${siteName}`);
        }

        
        try {
            const rawResults = await scraper.scrape(searchTerm);
            const filteredResults = PokemonFilter.filterResults(rawResults, searchTerm);
            
            progressCallback?.({
                type: 'single-complete',
                site: siteName,
                rawCount: rawResults.length,
                filteredCount: filteredResults.length,
                results: filteredResults
            });

            return filteredResults;
            
        } catch (error) {
            if (this.logger) {
                await this.logger.logError(error, `Scraping ${siteName} pour "${searchTerm}"`);
            }
            throw error;
        }
    }

    /**
     * Active le mode test (délais réduits)
     */
    enableTestMode() {
        this.options.testMode = true;
        this.delayManager.enableTestMode();
    }

    /**
     * Désactive le mode test
     */
    disableTestMode() {
        this.options.testMode = false;
        this.delayManager.disableTestMode();
    }

    /**
     * Retourne la liste des sites disponibles
     */
    getAvailableSites() {
        return Object.keys(this.scrapers);
    }

    /**
     * Estime le temps de scraping
     */
    estimateScrapingTime(searchCount, mode = 'sequential') {
        const siteCount = this.scrapersArray.length;
        
        if (mode === 'parallel') {
            // En parallèle : temps = max(temps_par_site) + délais_minimaux
            return this.delayManager.estimateScrapingTime(searchCount, 1);
        } else {
            // En séquentiel : temps cumulé
            return this.delayManager.estimateScrapingTime(searchCount, siteCount);
        }
    }

    /**
     * Nettoyage des ressources
     */
    async cleanup() {
        
        for (const [siteName, scraper] of Object.entries(this.scrapers)) {
            if (scraper.closeBrowser && typeof scraper.closeBrowser === 'function') {
                try {
                    await scraper.closeBrowser();
                } catch (error) {
                    console.warn(`⚠️ Erreur fermeture browser ${siteName}:`, error.message);
                }
            }
        }
        
    }
}