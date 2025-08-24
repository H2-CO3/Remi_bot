import dotenv from 'dotenv';
import { ScrappingService } from './services/scrapping-service.js';

dotenv.config();

async function main() {
  console.log('🤖 Bot Remi - Pokemon Card Scraper');
  console.log('==================================');
  
  const scrappingService = new ScrappingService();
  
  try {
    console.log('\n🧪 Testing Discord connection...');
    await scrappingService.testDiscord();
    
    console.log('\n🚀 Starting scraping process...');
    const results = await scrappingService.scrapeAll();
    
    console.log('\n✅ Scraping completed!');
    console.log(`📊 Final Summary:`);
    console.log(`   - Sites scraped: ${results.summary.sitesScraped}`);
    console.log(`   - Cards searched: ${results.summary.cardsSearched}`);  
    console.log(`   - Total results found: ${results.summary.totalResults}`);
    console.log(`   - Bargains detected: ${results.summary.bargainsFound}`);
    
    if (results.bargains.length > 0) {
      console.log('\n🎯 BONNES AFFAIRES TROUVÉES:');
      results.bargains.forEach(({ result, maxPrice }) => {
        const savings = maxPrice - result.price;
        console.log(`   - ${result.title}`);
        console.log(`     Prix: ${result.priceText} (économie: ${savings.toFixed(2)}€)`);
        console.log(`     Site: ${result.site}`);
        console.log(`     Lien: ${result.link}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}