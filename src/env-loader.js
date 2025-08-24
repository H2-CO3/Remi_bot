import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement du .env AVANT tout autre import
const result = dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
}

export {};