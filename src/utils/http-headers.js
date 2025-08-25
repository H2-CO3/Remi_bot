/**
 * Service centralisé pour la gestion des headers HTTP anti-bot
 */

import { getRandomUserAgent } from './user-agents.js';

export class HttpHeadersService {
  
  /**
   * Headers complets pour requêtes axios (scraping basique)
   */
  static getAxiosHeaders() {
    return {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };
  }

  /**
   * Headers pour Puppeteer (navigation plus réaliste)
   */
  static getPuppeteerHeaders() {
    return {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  /**
   * Headers spécialisés par site (anti-détection)
   */
  static getSiteSpecificHeaders(siteName) {
    const baseHeaders = this.getAxiosHeaders();
    
    switch (siteName.toLowerCase()) {
      case 'ebay':
        return {
          ...baseHeaders,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Referer': 'https://www.ebay.fr/',
          'X-Requested-With': undefined // Remove if present
        };
        
        
      case 'vinted':
        return {
          ...baseHeaders,
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Referer': 'https://www.vinted.fr/'
        };
        
      default:
        return baseHeaders;
    }
  }

  /**
   * Configuration Puppeteer complète pour un site
   */
  static async configurePuppeteerPage(page, siteName = 'default') {
    // User Agent aléatoire
    await page.setUserAgent(getRandomUserAgent());
    
    // Headers HTTP
    await page.setExtraHTTPHeaders(this.getPuppeteerHeaders());
    
    // Viewport réaliste
    await page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 1
    });

    // JavaScript enabled mais avec protections
    await page.setJavaScriptEnabled(true);
    
    // Laisser tout passer - pas d'interception de requêtes

    // Configuration spécifique par site
    switch (siteName.toLowerCase()) {
      case 'ebay':
        // Simuler un utilisateur français
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'language', { get: () => 'fr-FR' });
          Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
        });
        break;
        
    }
  }

  /**
   * Options axios pré-configurées par site
   */
  static getAxiosConfig(siteName, url) {
    return {
      headers: this.getSiteSpecificHeaders(siteName),
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      },
      // Options anti-détection
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    };
  }
}