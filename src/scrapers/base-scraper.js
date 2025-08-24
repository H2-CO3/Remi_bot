import axios from 'axios';
import * as cheerio from 'cheerio';
import { getRandomUserAgent } from '../utils/user-agents.js';
import { getRandomDelay, sleep } from '../utils/delays.js';
import { parsePrice } from '../utils/price-parser.js';
import { RelevanceFilter } from '../utils/relevance-filter.js';
import { PokemonFilter } from '../utils/pokemon-filter.js';

export class BaseScraper {
  constructor(siteConfig) {
    this.config = siteConfig;
    this.name = siteConfig.name;
  }

  async scrape(searchTerm) {
    try {
      
      const delay = getRandomDelay(this.config.delay.min, this.config.delay.max);
      await sleep(delay);
      
      const url = this.buildSearchUrl(searchTerm);
      
      const html = await this.fetchPage(url);
      const allResults = await this.parseResults(html, searchTerm);
      
      // Appliquer le filtrage de pertinence strict
      const filteredResults = this.filterRelevantResults(allResults, searchTerm);
      
      return filteredResults;
      
    } catch (error) {
      const errorDetails = {
        site: this.name,
        searchTerm: searchTerm,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      console.error(`❌ Error scraping ${this.name}:`, error.message);
      console.error('Error details:', errorDetails);
      
      // Relancer l'erreur avec plus de contexte
      throw new Error(`${this.name}: ${error.message}`);
    }
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

  async fetchPage(url) {
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    const response = await axios.get(url, { 
      headers,
      timeout: 10000,
      maxRedirects: 3
    });
    
    return response.data;
  }

  async parseResults(html, searchTerm) {
    const $ = cheerio.load(html);
    const results = [];
    
    const items = $(this.config.selectors.items);
    
    items.each((index, element) => {
      try {
        const $item = $(element);
        
        const title = this.extractTitle($item);
        const price = this.extractPrice($item);
        const link = this.extractLink($item);
        const image = this.extractImage($item);
        
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

  extractTitle($item) {
    const titleEl = $item.find(this.config.selectors.title);
    return titleEl.text() || titleEl.attr('title') || titleEl.attr('alt');
  }

  extractPrice($item) {
    const priceEl = $item.find(this.config.selectors.price);
    return priceEl.text();
  }

  extractLink($item) {
    const linkEl = $item.find(this.config.selectors.link);
    return linkEl.attr('href') || $item.attr('href');
  }

  extractImage($item) {
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

  // Filtrage simple par défaut
  filterRelevantResults(results, searchTerm) {
    
    // Utiliser le nouveau filtrage simple
    return PokemonFilter.filterResults(results, searchTerm);
  }
}