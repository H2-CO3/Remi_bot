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

  async scrape(searchTerm) {
    let page = null;
    try {
      console.log(`🔍 [VINTED] Starting scrape for: ${searchTerm}`);
      
      const browser = await this.initBrowser();
      console.log(`✅ [VINTED] Browser initialized successfully`);
      
      page = await browser.newPage();
      console.log(`✅ [VINTED] New page created`);
      
      // Cookies de consentement optimisés avec dates dynamiques longues
      console.log(`🍪 [VINTED] Setting consent cookies...`);
      const now = new Date();
      const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      const currentISOString = now.toISOString();
      const longDateString = oneYearLater.toISOString();
      
      await page.setCookie(
        {
          name: 'OptanonAlertBoxClosed',
          value: currentISOString,
          domain: '.vinted.fr',
          expires: Math.floor(oneYearLater.getTime() / 1000)
        },
        {
          name: 'OptanonConsent',
          value: `isGpcEnabled=1&datestamp=${encodeURIComponent(now.toString())}&version=202505.2.0&browserGpcFlag=1&isIABGlobal=false&hosts=H4%3A1%2CH525%3A1%2CH613%3A1&groups=C0001%3A1%2CC0002%3A0%2CC0003%3A0%2CC0004%3A0%2CC0005%3A0&genVendors=V2%3A0%2CV1%3A0%2C&intType=2`,
          domain: '.vinted.fr',
          expires: Math.floor(oneYearLater.getTime() / 1000)
        },
        {
          name: 'eupubconsent-v2',
          value: 'CQWs3HAQWs3HAAcABBFRB5FgAAAAAEPgAChQAAAWZABMNCogjLIgBCJQMAIEACgrCACgQBAAAkDRAQAmDApyBgAusJkAIAUAAwQAgABBgACAAASABCIAKACAQAAQCBQABgAQBAQAMDAAGACxEAgABAdAxTAggECwASMyqDTAlAASCAlsqEEgCBBXCEIs8AggREwUAAAIABQEAADwWAhJICViQQBcQTQAAEAAAUQIECKRswBBQGaLQXgyfRkaYBg-YJklMgyAJgjIyTYhN-Ew8chRAAAA.YAAACHwAAAAA',
          domain: '.vinted.fr',
          expires: Math.floor(oneYearLater.getTime() / 1000)
        },
        {
          name: 'anonymous-locale',
          value: 'fr',
          domain: 'www.vinted.fr',
          expires: Math.floor(oneYearLater.getTime() / 1000)
        }
      );
      console.log(`✅ [VINTED] Cookies set successfully`);
      
      // Configuration via le service centralisé
      console.log(`⚙️ [VINTED] Configuring page headers...`);
      const { HttpHeadersService } = await import('../utils/http-headers.js');
      await HttpHeadersService.configurePuppeteerPage(page, this.name);
      console.log(`✅ [VINTED] Headers configured`);
      
      const url = this.buildSearchUrl(searchTerm);
      console.log(`📡 [VINTED] Navigating to URL: ${url}`);
      
      // Navigation avec stratégie plus fiable
      console.log(`⏳ [VINTED] Starting navigation with domcontentloaded...`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 // 1 minute pour domcontentloaded
      });
      console.log(`✅ [VINTED] DOM loaded, now waiting for cards...`);
      
      // Attendre explicitement que les cartes apparaissent
      console.log(`⏳ [VINTED] Waiting for feed cards to load...`);
      try {
        await page.waitForSelector('.feed-grid__item', { timeout: 60000 });
        console.log(`✅ [VINTED] Cards found successfully`);
      } catch (error) {
        console.warn(`⚠️ [VINTED] Cards not found, proceeding anyway: ${error.message}`);
      }
      
      // Récupérer et parser les résultats
      console.log(`📄 [VINTED] Getting page content...`);
      const html = await page.content();
      console.log(`✅ [VINTED] Page content retrieved (${html.length} chars)`);
      
      console.log(`🔍 [VINTED] Parsing results...`);
      const allResults = await this.parseResults(html, searchTerm);
      console.log(`✅ [VINTED] Found ${allResults.length} raw results`);
      
      // Appliquer le filtrage de pertinence
      console.log(`🎯 [VINTED] Filtering results...`);
      const filteredResults = this.filterRelevantResults(allResults, searchTerm);
      console.log(`✅ [VINTED] Filtered to ${filteredResults.length} relevant results`);
      
      return filteredResults;
      
    } catch (error) {
      console.error(`❌ [VINTED] Error during scraping:`, error.message);
      console.error(`❌ [VINTED] Error stack:`, error.stack);
      
      if (page) {
        try {
          const currentUrl = await page.url();
          console.error(`❌ [VINTED] Current page URL: ${currentUrl}`);
          
          const title = await page.title();
          console.error(`❌ [VINTED] Current page title: ${title}`);
        } catch (debugError) {
          console.error(`❌ [VINTED] Cannot get page debug info`);
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
      console.log(`🔍 [VINTED] Waiting for content selectors (30s timeout)...`);
      
      // Wait for either items to appear or "no results" message
      await Promise.race([
        page.waitForSelector('.feed-grid__item', { timeout: 30000 }),
        page.waitForSelector('[data-testid="no-results"]', { timeout: 30000 }),
        page.waitForSelector('.catalog-item', { timeout: 30000 }) // Fallback selector
      ]);
      
      console.log(`✅ [VINTED] Content selectors found, waiting 2s for full load...`);
      // Additional wait to ensure all items are loaded
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`✅ [VINTED] Content wait completed`);
      
    } catch (error) {
      console.warn(`⚠️ [VINTED] Timeout waiting for content selectors, proceeding anyway`);
      console.warn(`⚠️ [VINTED] Error: ${error.message}`);
      console.log(`⏳ [VINTED] Final fallback wait (5s)...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Final fallback
      console.log(`✅ [VINTED] Fallback wait completed`);
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
    
    // COMMENTÉ: Suppression du double filtrage qui bloquait le workflow
    // Le filtrage se fait déjà dans scrape() ligne 101
    // return this.filterRelevantResults(results, searchTerm);
    
    return results; // Retourner les résultats bruts, filtrage fait dans scrape()
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