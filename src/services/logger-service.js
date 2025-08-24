import fs from 'fs/promises';
import path from 'path';

export class LoggerService {
  constructor(logFilePath = './logs/results.log') {
    this.logFilePath = logFilePath;
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    const dir = path.dirname(this.logFilePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }

  async logResult(result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      site: result.site,
      title: result.title,
      price: result.priceText,
      link: result.link,
      searchTerm: result.searchTerm
    };

    const logLine = `${JSON.stringify(logEntry)}\n`;
    
    try {
      await fs.appendFile(this.logFilePath, logLine, 'utf8');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  async logBargain(result, maxPrice) {
    const bargainEntry = {
      timestamp: new Date().toISOString(),
      type: 'BARGAIN_FOUND',
      site: result.site,
      title: result.title,
      price: result.price,
      priceText: result.priceText,
      maxPrice: maxPrice,
      savings: maxPrice - result.price,
      link: result.link,
      searchTerm: result.searchTerm
    };

    const logLine = `🎯 BONNE AFFAIRE: ${JSON.stringify(bargainEntry)}\n`;
    
    try {
      await fs.appendFile(this.logFilePath, logLine, 'utf8');
    } catch (error) {
      console.error('Error writing bargain to log file:', error);
    }
  }

  async logError(error, context = '') {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      message: error.message,
      context: context,
      stack: error.stack
    };

    const logLine = `❌ ERROR: ${JSON.stringify(errorEntry)}\n`;
    
    try {
      await fs.appendFile(this.logFilePath, logLine, 'utf8');
    } catch (writeError) {
      console.error('Error writing error to log file:', writeError);
    }
  }
}