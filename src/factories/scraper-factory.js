import { VintedPuppeteerScraper } from '../scrapers/vinted-puppeteer-scraper.js';
import { EbayPuppeteerScraper } from '../scrapers/ebay-puppeteer-scraper.js';
import { SITES_CONFIG } from '../config/sites.js';

/**
 * Factory pour créer des scrapers de manière cohérente
 * Garantit que tous les services utilisent les mêmes scrapers
 */
export class ScraperFactory {
    /**
     * Crée tous les scrapers disponibles
     * @returns {Object} Map des scrapers par nom de site
     */
    static createScrapers() {
        return {
            vinted: new VintedPuppeteerScraper(SITES_CONFIG.vinted),
            ebay: new EbayPuppeteerScraper(SITES_CONFIG.ebay)
            // cardmarket: désactivé temporairement (erreurs 403)
            // leboncoin: désactivé temporairement (protection anti-bot)
        };
    }

    /**
     * Crée un scraper spécifique
     * @param {string} siteName - Nom du site (vinted, ebay, etc.)
     * @returns {BaseScraper} Instance du scraper
     */
    static createScraper(siteName) {
        const scrapers = this.createScrapers();
        const scraper = scrapers[siteName.toLowerCase()];
        
        if (!scraper) {
            throw new Error(`Scraper non disponible pour le site: ${siteName}`);
        }
        
        return scraper;
    }

    /**
     * Liste des sites disponibles
     * @returns {Array<string>} Noms des sites supportés
     */
    static getAvailableSites() {
        return Object.keys(this.createScrapers());
    }

    /**
     * Vérifie si un site est supporté
     * @param {string} siteName - Nom du site
     * @returns {boolean} True si supporté
     */
    static isSiteSupported(siteName) {
        return this.getAvailableSites().includes(siteName.toLowerCase());
    }

    /**
     * Crée les scrapers sous forme de tableau (pour AutoScrapingService)
     * @returns {Array<BaseScraper>} Tableau des scrapers
     */
    static createScrapersArray() {
        return Object.values(this.createScrapers());
    }
}