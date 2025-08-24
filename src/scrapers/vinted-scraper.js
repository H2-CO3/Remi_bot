import { BaseScraper } from './base-scraper.js';

export class VintedScraper extends BaseScraper {
  constructor(siteConfig) {
    super(siteConfig);
  }

  extractTitle($item) {
    const titleSelectors = [
      '.ItemBox_overlay__1kNfX .ItemBox_details__9gKOB .Text_text__QBn4-',
      '.ItemBox_details .Text_text',
      '[data-testid="item-title"]',
      '.item-title',
      'h3'
    ];
    
    for (const selector of titleSelectors) {
      const element = $item.find(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text) return text;
      }
    }
    
    return super.extractTitle($item);
  }

  extractPrice($item) {
    const priceSelectors = [
      '.ItemBox_overlay__1kNfX .ItemBox_details__9gKOB .Text_text__QBn4-',
      '.ItemBox_price',
      '[data-testid="item-price"]', 
      '.item-price'
    ];
    
    for (const selector of priceSelectors) {
      const elements = $item.find(selector);
      elements.each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('€')) {
          return text;
        }
      });
    }
    
    return super.extractPrice($item);
  }

  extractLink($item) {
    const link = $item.find('a').first().attr('href') || $item.attr('href');
    return link;
  }

  extractImage($item) {
    const imgSelectors = [
      '.ItemBox_image img',
      '[data-testid="item-photo"] img',
      'img'
    ];
    
    for (const selector of imgSelectors) {
      const img = $item.find(selector).first();
      if (img.length) {
        return img.attr('src') || img.attr('data-src');
      }
    }
    
    return super.extractImage($item);
  }
}