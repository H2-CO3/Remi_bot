import { CARDS_TO_WATCH } from '../config/cards.js';
import { UnifiedScrapingService } from './unified-scraping-service.js';
import { LoggerService } from './logger-service.js';
import { DiscordService } from './discord-service.js';

export class ScrappingService {
  constructor() {
    // Utiliser le service unifié en mode test (délais réduits, mode parallèle possible)
    this.unifiedService = new UnifiedScrapingService({
      testMode: true,            // Délais réduits pour tests manuels
      enableDelays: true,        // Garder des délais mais réduits
      enableLogging: true        // Logging activé pour interface
    });
    
    this.logger = new LoggerService();
    this.discord = new DiscordService();
    
  }

  initializeScrapers() {
    // Compatibilité : retourner les scrapers du service unifié
    return this.unifiedService.scrapers;
  }

  async scrapeAll() {
    
    const allResults = [];
    const bargains = [];

    for (const card of CARDS_TO_WATCH) {
      
      for (const searchTerm of card.searchTerms) {
        
        const results = await this.scrapeAllSites(searchTerm);
        
        for (const result of results) {
          allResults.push(result);
          await this.logger.logResult(result);
          
          if (result.price && result.price <= card.maxPrice) {
            bargains.push({ result, maxPrice: card.maxPrice, card });
            
            await this.logger.logBargain(result, card.maxPrice);
            await this.discord.sendBargainAlert(result, card.maxPrice);
          }
        }
      }
    }

    
    return {
      results: allResults,
      bargains: bargains,
      summary: {
        totalResults: allResults.length,
        bargainsFound: bargains.length,
        sitesScraped: Object.keys(this.scrapers).length,
        cardsSearched: CARDS_TO_WATCH.length
      }
    };
  }

  async scrapeAllSites(searchTerm) {
    const promises = Object.entries(this.scrapers).map(async ([siteName, scraper]) => {
      try {
        return await scraper.scrape(searchTerm);
      } catch (error) {
        console.error(`❌ Error scraping ${siteName}:`, error.message);
        await this.logger.logError(error, `Scraping ${siteName} for "${searchTerm}"`);
        return [];
      }
    });

    const results = await Promise.allSettled(promises);
    
    return results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value);
  }

  async scrapeSingle(siteName, searchTerm) {
    const scraper = this.scrapers[siteName];
    if (!scraper) {
      throw new Error(`Unknown site: ${siteName}`);
    }

    try {
      return await scraper.scrape(searchTerm);
    } catch (error) {
      await this.logger.logError(error, `Scraping ${siteName} for "${searchTerm}"`);
      throw error;
    }
  }

  async testDiscord() {
    return await this.discord.sendTestMessage();
  }

  async testDiscordCustom(message) {
    return await this.discord.sendCustomMessage(message);
  }

  async scrapeForCard(cardReference, maxPrice, progressCallback) {

    progressCallback?.({
      type: 'scrape-start',
      message: `🔍 Recherche de "${cardReference}" (max: ${maxPrice}€)`
    });

    try {
      // Utiliser le service unifié en mode séquentiel (même avec délais réduits)
      const scrapingResult = await this.unifiedService.scrapeSequential(
        cardReference,
        (update) => {
          // Transformer les callbacks pour compatibilité avec l'interface existante
          if (update.type === 'site-start') {
            progressCallback?.({
              type: 'scrape-site-start',
              site: update.site,
              message: `🔍 Scraping ${update.site}...`
            });
          } else if (update.type === 'site-success') {
            progressCallback?.({
              type: 'scrape-site-success',
              site: update.site,
              results: update.filteredCount,
              message: `✅ ${update.filteredCount} résultats trouvés`
            });
          } else if (update.type === 'site-error') {
            progressCallback?.({
              type: 'scrape-site-error',
              site: update.site,
              message: update.error
            });
          }
        }
      );

      // Log des résultats si nécessaire
      for (const result of scrapingResult.allResults) {
        await this.logger.logResult(result);
      }

      // Retourner les résultats dans le format attendu par l'interface
      return {
        results: scrapingResult.allResults,
        resultsBySite: scrapingResult.resultsBySite,
        summary: scrapingResult.summary
      };

    } catch (error) {
      console.error(`❌ Error in scrapeForCard:`, error.message);
      await this.logger.logError(error, `Scraping pour "${cardReference}"`);
      throw error;
    }
  }

  getAvailableSites() {
    return this.unifiedService.getAvailableSites();
  }

  async cleanup() {
    await this.unifiedService.cleanup();
  }
}