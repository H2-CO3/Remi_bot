import { BaseScraper } from './base-scraper.js';

export class EbayScraper extends BaseScraper {
  constructor(siteConfig) {
    super(siteConfig);
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