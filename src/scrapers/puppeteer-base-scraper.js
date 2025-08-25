import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { getRandomUserAgent } from '../utils/user-agents.js';
import { getRandomDelay, sleep } from '../utils/delays.js';
import { parsePrice } from '../utils/price-parser.js';
import { PokemonFilter } from '../utils/pokemon-filter.js';

export class PuppeteerBaseScraper {
  constructor(siteConfig) {
    this.config = siteConfig;
    this.name = siteConfig.name;
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      const browserOptions = {
        executablePath: '/usr/bin/chromium', // Pointer vers Chromium système 
        headless: false, // Mode visuel pour débugger
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          // Optimisations spécifiques Raspberry Pi
          '--memory-pressure-off',
          '--max-old-space-size=512',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-notifications',
          '--disable-plugins',
          '--disable-java'
        ]
      };
      
      // En production (hébergement partagé), utiliser single-process
      if (isProduction) {
        browserOptions.args.push('--single-process');
        console.log('🔧 [PUPPETEER] Mode production - single-process activé');
      }
      
      try {
        this.browser = await puppeteer.launch(browserOptions);
        console.log('✅ [PUPPETEER] Browser lancé avec succès');
      } catch (error) {
        console.error('❌ [PUPPETEER] Erreur lancement browser:', error.message);
        throw error;
      }
    }
    return this.browser;
  }

  async scrape(searchTerm) {
    let page = null;
    try {
      console.log(`🔍 Puppeteer scraping ${this.name} for: ${searchTerm}`);
      
      const delay = getRandomDelay(this.config.delay.min, this.config.delay.max);
      await sleep(delay);
      
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      // Timeout par défaut ultra-élevé pour Raspberry Pi + Vinted
      page.setDefaultNavigationTimeout(180000); // 3 minutes pour navigation
      page.setDefaultTimeout(120000); // 2 minutes pour les sélecteurs
      
      // Configuration via le service centralisé
      const { HttpHeadersService } = await import('../utils/http-headers.js');
      await HttpHeadersService.configurePuppeteerPage(page, this.name);
      
      const url = this.buildSearchUrl(searchTerm);
      console.log(`📡 Puppeteer URL: ${url}`);
      
      // Navigate to page - Stratégie progressive pour RPi + Vinted
      try {
        // Première tentative avec networkidle2 (plus rapide)
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 120000 // 2 minutes
        });
      } catch (timeoutError) {
        console.warn(`⚠️ Timeout avec networkidle2, tentative avec domcontentloaded...`);
        // Deuxième tentative avec domcontentloaded (moins strict)
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 // 1 minute
        });
        // Attente manuelle pour le JS
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      // Wait for content to load
      await this.waitForContent(page);
      
      // Get HTML content
      const html = await page.content();
      
      // Parse with Cheerio
      const allResults = await this.parseResults(html, searchTerm);
      
      // Appliquer le filtrage de pertinence strict (même logique que BaseScraper)
      const filteredResults = this.filterRelevantResults(allResults, searchTerm);
      
      console.log(`✅ Found ${allResults.length} results on ${this.name} with Puppeteer, ${filteredResults.length} after filtering`);
      return filteredResults;
      
    } catch (error) {
      const errorDetails = {
        site: this.name,
        searchTerm: searchTerm,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      console.error(`❌ Error in Puppeteer scraping ${this.name}:`, error.message);
      console.error('Error details:', errorDetails);
      
      throw new Error(`${this.name} (Puppeteer): ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async waitForContent(page) {
    // Override in child classes
    await sleep(3000); // Default wait
  }

  buildSearchUrl(searchTerm) {
    const url = new URL(this.config.searchUrl);
    
    Object.entries(this.config.searchParams).forEach(([key, value]) => {
      if (key === 'search_text' || key === 'text' || key === '_nkw' || key === 'searchString') {
        url.searchParams.set(key, searchTerm);
      } else {
        url.searchParams.set(key, value);
      }
    });
    
    return url.toString();
  }

  async parseResults(html, searchTerm) {
    const $ = cheerio.load(html);
    const results = [];
    
    const items = $(this.config.selectors.items);
    console.log(`🔎 Found ${items.length} items with selector: ${this.config.selectors.items}`);
    
    items.each((index, element) => {
      try {
        const $item = $(element);
        
        const title = this.extractTitle($item, $);
        const price = this.extractPrice($item, $);
        const link = this.extractLink($item, $);
        const image = this.extractImage($item, $);
        
        if (title && link) {
          results.push({
            site: this.name,
            title: title.trim(),
            price: parsePrice(price),
            priceText: price?.trim() || 'N/A',
            link: this.normalizeUrl(link),
            image: image ? this.normalizeUrl(image) : null,
            searchTerm,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error parsing item on ${this.name}:`, error.message);
      }
    });
    
    return results;
  }

  extractTitle($item, $) {
    const titleEl = $item.find(this.config.selectors.title);
    return titleEl.text() || titleEl.attr('title') || titleEl.attr('alt');
  }

  extractPrice($item, $) {
    const priceEl = $item.find(this.config.selectors.price);
    return priceEl.text();
  }

  extractLink($item, $) {
    const linkEl = $item.find(this.config.selectors.link);
    return linkEl.attr('href') || $item.attr('href');
  }

  extractImage($item, $) {
    const imgEl = $item.find(this.config.selectors.image);
    return imgEl.attr('src') || imgEl.attr('data-src');
  }

  normalizeUrl(url) {
    if (!url) return null;
    
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    if (url.startsWith('/')) {
      return `${this.config.baseUrl}${url}`;
    }
    
    return url;
  }

  // Filtrage identique à BaseScraper
  filterRelevantResults(results, searchTerm) {
    console.log(`🔍 Filtrage ${this.name} (Puppeteer) pour: "${searchTerm}"`);
    
    return PokemonFilter.filterResults(results, searchTerm);
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}