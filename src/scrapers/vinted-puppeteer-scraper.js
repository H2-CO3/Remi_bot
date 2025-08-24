import { PuppeteerBaseScraper } from './puppeteer-base-scraper.js';
import { RelevanceFilter } from '../utils/relevance-filter.js';
import { PokemonFilter } from '../utils/pokemon-filter.js';

export class VintedPuppeteerScraper extends PuppeteerBaseScraper {
  constructor(siteConfig) {
    super(siteConfig);
    // Updated selectors for Vinted after JS loading (working selectors from debug)
    this.config.selectors = {
      items: '.feed-grid__item',
      title: '.ItemBox_overlay__1kNfX .ItemBox_details__9gKOB .Text_text__QBn4-',
      price: '.ItemBox_overlay__1kNfX .ItemBox_details__9gKOB .Text_text__QBn4-',
      link: 'a',
      image: 'img'
    };
  }

  // Override pour diagnostiquer les problèmes Vinted sur RPi
  async scrape(searchTerm) {
    let page = null;
    try {
      console.log(`🔍 [VINTED DEBUG] Starting Vinted scrape for: ${searchTerm}`);
      
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      // DEBUG: Mode non-headless pour voir ce qui se passe
      console.log(`🔍 [VINTED DEBUG] Browser launched, navigating...`);
      
      const url = this.buildSearchUrl(searchTerm);
      console.log(`📡 [VINTED DEBUG] URL: ${url}`);
      
      // TEST 1: DOMContentLoaded au lieu de NetworkIdle2
      console.log(`⏳ [VINTED DEBUG] Navigation avec DOMContentLoaded...`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      console.log(`✅ [VINTED DEBUG] DOMContentLoaded terminé, attente 5s pour JS...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // TEST 2: Vérifier le contenu de la page
      const title = await page.title();
      console.log(`📄 [VINTED DEBUG] Page title: ${title}`);
      
      // TEST 3: Chercher des modales/bannières
      const modals = await page.$$('div[class*="modal"], div[class*="cookie"], div[class*="consent"], div[class*="gdpr"]');
      console.log(`🍪 [VINTED DEBUG] Modales détectées: ${modals.length}`);
      
      if (modals.length > 0) {
        console.log(`🍪 [VINTED DEBUG] Tentative de fermeture des modales...`);
        // Essayer de fermer les modales
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button[class*="accept"], button[class*="close"], button[class*="dismiss"], .close-btn, [data-testid*="accept"]');
          buttons.forEach(btn => btn.click());
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // TEST 4: Attendre le contenu Vinted
      await this.waitForContent(page);
      
      // Récupérer et parser les résultats
      const html = await page.content();
      console.log(`📏 [VINTED DEBUG] HTML length: ${html.length} chars`);
      
      const allResults = await this.parseResults(html, searchTerm);
      console.log(`📦 [VINTED DEBUG] Raw results found: ${allResults.length}`);
      
      return allResults;
      
    } catch (error) {
      console.error(`❌ [VINTED DEBUG] Error:`, error.message);
      
      if (page) {
        try {
          const title = await page.title();
          const url = await page.url();
          console.error(`❌ [VINTED DEBUG] Page state - Title: ${title}, URL: ${url}`);
        } catch (debugError) {
          console.error(`❌ [VINTED DEBUG] Cannot get page state`);
        }
      }
      
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  // Filtrer les résultats pour éviter le flood et garder seulement les items pertinents
  filterRelevantResults(results, searchTerm) {
    console.log(`🔍 Filtrage Vinted simple pour: "${searchTerm}"`);
    
    // Utiliser le nouveau filtrage simple
    return PokemonFilter.filterResults(results, searchTerm);
  }

  async waitForContent(page) {
    try {
      console.log(`⏳ Waiting for Vinted content to load...`);
      
      // Stratégie multiple pour attendre le contenu Vinted
      await Promise.race([
        // Sélecteurs principaux avec timeout élevé
        page.waitForSelector('.feed-grid__item', { timeout: 60000 }),
        page.waitForSelector('[data-testid="no-results"]', { timeout: 60000 }),
        page.waitForSelector('.catalog-item', { timeout: 60000 }),
        // Sélecteurs de fallback
        page.waitForSelector('.ItemBox_overlay__1kNfX', { timeout: 60000 }),
        page.waitForSelector('[class*="ItemBox"]', { timeout: 60000 })
      ]);
      
      // Attente supplémentaire pour le lazy loading
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      console.log(`✅ Vinted content loaded`);
    } catch (error) {
      console.warn(`⚠️ Timeout waiting for Vinted content, proceeding anyway`);
      
      // En cas d'échec, essayer de scroll pour déclencher le lazy loading
      try {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Deuxième tentative avec timeout réduit
        await Promise.race([
          page.waitForSelector('.feed-grid__item', { timeout: 15000 }),
          page.waitForSelector('.catalog-item', { timeout: 15000 }),
          page.waitForSelector('[class*="ItemBox"]', { timeout: 15000 })
        ]);
        console.log(`✅ Vinted content loaded after scroll`);
      } catch (secondError) {
        console.warn(`⚠️ Final fallback - proceeding with whatever content is available`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  extractTitle($item, $) {
    // Essayer d'extraire le titre depuis l'URL du produit
    const link = $item.find('a').attr('href') || '';
    if (link.includes('/items/')) {
      const urlParts = link.split('/');
      const itemSlug = urlParts[urlParts.length - 1];
      if (itemSlug && itemSlug !== '?referrer=catalog') {
        // Nettoyer le slug pour en faire un titre lisible
        const titleFromUrl = itemSlug
          .replace(/\?.*/, '') // Supprimer les paramètres
          .replace(/-/g, ' ') // Remplacer les tirets par des espaces
          .replace(/^\d+\s*/, '') // Supprimer les numéros en début
          .trim();
        
        if (titleFromUrl.length > 3) {
          console.log(`📝 Vinted title from URL: ${titleFromUrl}`);
          return titleFromUrl;
        }
      }
    }
    
    // Fallback: marque + condition
    const brand = $item.find('[data-testid*="--description-title"]').text().trim();
    const condition = $item.find('[data-testid*="--description-subtitle"]').text().trim();
    
    if (brand && condition && !condition.includes('Pokemon')) {
      const title = `${brand} - ${condition}`;
      console.log(`📝 Vinted title (brand + condition): ${title}`);
      return title;
    }
    
    if (brand && brand !== 'Pokémon') {
      console.log(`📝 Vinted title (brand only): ${brand}`);
      return brand;
    }
    
    console.log(`📝 Vinted title fallback: Article Pokemon`);
    return 'Article Pokemon';
  }

  async parseResults(html, searchTerm) {
    // Utiliser la méthode parent pour parser les résultats
    const results = await super.parseResults(html, searchTerm);
    
    // Appliquer le filtrage de pertinence spécifique à Vinted
    return this.filterRelevantResults(results, searchTerm);
  }

  extractPrice($item, $) {
    // Try multiple selectors for price
    const priceSelectors = [
      '[data-testid="item-price"]',
      '.catalog-item__price',
      '.item-price',
      '.web_ui__Text__text',
      'span'
    ];
    
    for (const selector of priceSelectors) {
      const elements = $item.find(selector);
      elements.each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('€')) {
          console.log(`💰 Found price with selector ${selector}: ${text}`);
          return text;
        }
      });
    }
    
    // Fallback: search for € in all text
    const itemText = $item.text();
    const priceMatch = itemText.match(/(\d+(?:[,.]?\d+)?\s*€)/);
    if (priceMatch) {
      console.log(`💰 Fallback price: ${priceMatch[0]}`);
      return priceMatch[0];
    }
    
    return null;
  }

  extractLink($item, $) {
    // The item itself is the link for Vinted
    const href = $item.attr('href');
    if (href) {
      console.log(`🔗 Found link: ${href}`);
      return href;
    }
    
    // Fallback: look for nested links
    const nestedLink = $item.find('a').first().attr('href');
    if (nestedLink) {
      console.log(`🔗 Found nested link: ${nestedLink}`);
      return nestedLink;
    }
    
    return null;
  }

  extractImage($item, $) {
    const imgSelectors = [
      'img[data-testid="item-photo"]',
      '.catalog-item__photo img',
      'img'
    ];
    
    for (const selector of imgSelectors) {
      const img = $item.find(selector).first();
      if (img.length) {
        const src = img.attr('src') || img.attr('data-src');
        if (src) {
          return src;
        }
      }
    }
    
    return null;
  }
}