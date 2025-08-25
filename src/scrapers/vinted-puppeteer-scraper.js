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
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      // Cookies de consentement optimisés avec dates dynamiques longues
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
      
      // Configuration via le service centralisé
      const { HttpHeadersService } = await import('../utils/http-headers.js');
      await HttpHeadersService.configurePuppeteerPage(page, this.name);
      
      const url = this.buildSearchUrl(searchTerm);
      
      // Navigation avec timeout adapté RPi
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 120000 // 2 minutes pour RPi
      });
      
      // Attendre le contenu Vinted avec fallback
      await this.waitForContent(page);
      
      // Récupérer et parser les résultats
      const html = await page.content();
      const allResults = await this.parseResults(html, searchTerm);
      
      // Appliquer le filtrage de pertinence
      const filteredResults = this.filterRelevantResults(allResults, searchTerm);
      
      return filteredResults;
      
    } catch (error) {
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
      // Wait for either items to appear or "no results" message
      await Promise.race([
        page.waitForSelector('.feed-grid__item', { timeout: 30000 }),
        page.waitForSelector('[data-testid="no-results"]', { timeout: 30000 }),
        page.waitForSelector('.catalog-item', { timeout: 30000 }) // Fallback selector
      ]);
      
      // Additional wait to ensure all items are loaded
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.warn(`⚠️ Timeout waiting for Vinted content, proceeding anyway`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Final fallback
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