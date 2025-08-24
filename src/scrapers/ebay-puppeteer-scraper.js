import { PuppeteerBaseScraper } from './puppeteer-base-scraper.js';
import { sleep } from '../utils/delays.js';

export class EbayPuppeteerScraper extends PuppeteerBaseScraper {
  constructor(siteConfig) {
    super(siteConfig);
  }

  async waitForContent(page) {
    try {
      console.log(`⏳ Waiting for eBay content...`);
      
      // Attendre les résultats eBay
      await page.waitForSelector([
        '.s-item',
        '.srp-results',
        '#srp-river-results'
      ].join(','), { 
        timeout: 15000 
      });
      
      await sleep(1500);
      console.log(`✅ eBay content loaded`);
      
    } catch (error) {
      console.warn(`⚠️ Timeout waiting for eBay content, continuing...`);
    }
  }

  // Override normalizeUrl pour nettoyer les URLs eBay
  normalizeUrl(url) {
    if (!url) return null;
    
    // Appliquer la normalisation de base (protocole, domaine)
    const baseNormalizedUrl = super.normalizeUrl(url);
    
    // Nettoyage spécifique eBay: garder seulement la partie stable
    if (baseNormalizedUrl && baseNormalizedUrl.includes('ebay.fr/itm/')) {
      // Extraire la partie stable: https://www.ebay.fr/itm/157194486817
      const cleanUrl = baseNormalizedUrl.split('?')[0];
      console.log(`🧹 eBay URL cleaned: ${baseNormalizedUrl} → ${cleanUrl}`);
      return cleanUrl;
    }
    
    return baseNormalizedUrl;
  }
}