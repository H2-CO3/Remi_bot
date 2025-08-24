// IMPORTANT: Charger l'environnement EN PREMIER
import './env-loader.js';

import express from 'express';
import fs from 'fs/promises';
import { query } from '../config/database.js';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { ScrappingService } from './services/scrapping-service.js';
import { AuthController } from './controllers/auth-controller.js';
import { CardsController } from './controllers/cards-controller.js';
import { ScraperController } from './controllers/scraper-controller.js';
import { requireAuth, requireAdmin, redirectIfAuthenticated, loginLimiter } from './middleware/auth-middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Sécurité
app.use(helmet({
    contentSecurityPolicy: false, // Pour WebSocket
}));

// Rate limiting global
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes par IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(generalLimiter);

// Sessions

// Configuration intelligente des cookies sécurisés
const isProduction = process.env.NODE_ENV === 'production';
const forceSecure = process.env.FORCE_SECURE_COOKIES === 'true';


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction && forceSecure, // Sécurisé uniquement si explicitement demandé
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
        sameSite: 'strict'
    }
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques pour l'interface publique
app.use('/public', express.static(path.join(__dirname, 'public')));

let scrappingService = new ScrappingService();
let connectedClients = new Set();

wss.on('connection', (ws) => {
  connectedClients.add(ws);
  
  ws.on('close', () => {
    connectedClients.delete(ws);
  });
});

function broadcastToClients(message) {
  const data = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

// Test Connexion BDD
app.get('/api/database-status', async (req, res) => {
  try {
    // Test de connexion simple
    await query('SELECT 1 as test');
    
    // Test plus complet : vérifier les tables principales
    const tables = await query("SHOW TABLES");
    const expectedTables = ['users', 'card_references', 'sent_alerts', 'scraping_logs', 'login_attempts'];
    const existingTables = tables.map(row => Object.values(row)[0]);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    // Compter les utilisateurs
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    const cardCount = await query('SELECT COUNT(*) as count FROM card_references WHERE active = TRUE');
    
    res.json({
      success: true,
      status: 'connected',
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      tables: {
        total: existingTables.length,
        existing: existingTables,
        missing: missingTables
      },
      data: {
        users: userCount[0].count,
        activeCards: cardCount[0].count
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database status error:', error);
    res.json({
      success: false,
      status: 'error',
      error: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString()
    });
  }
});

// Test Discord
app.post('/api/test-discord', async (req, res) => {
  try {
    broadcastToClients({ type: 'discord-test-start', message: 'Test Discord en cours...' });
    
    const success = await scrappingService.testDiscordCustom('coucou 👋');
    
    if (success) {
      broadcastToClients({ type: 'discord-test-success', message: '✅ Message "coucou" envoyé sur Discord !' });
      res.json({ success: true, message: 'Test Discord réussi' });
    } else {
      broadcastToClients({ type: 'discord-test-error', message: '❌ Échec du test Discord' });
      res.status(500).json({ success: false, message: 'Échec du test Discord' });
    }
  } catch (error) {
    console.error('Error in Discord test:', error);
    broadcastToClients({ type: 'discord-test-error', message: `❌ Erreur: ${error.message}` });
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lancer scraping
app.post('/api/scrape', async (req, res) => {
  try {
    const { cardReference, maxPrice } = req.body;
    
    if (!cardReference || !maxPrice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Référence de carte et prix maximum requis' 
      });
    }

    broadcastToClients({ 
      type: 'scrape-start', 
      message: `🔍 Recherche de "${cardReference}" (max: ${maxPrice}€)` 
    });

    const scrapingResult = await scrappingService.scrapeForCard(cardReference, maxPrice, (update) => {
      broadcastToClients(update);
    });

    // Utiliser les résultats structurés du service unifié
    const finalResults = scrapingResult.results.filter(result => result.price && result.price <= maxPrice);
    const resultsBySite = scrapingResult.resultsBySite;

    broadcastToClients({ 
      type: 'scrape-complete', 
      results: finalResults,
      summary: {
        resultsFound: finalResults.length
      }
    });

    res.json({ 
      success: true, 
      results: finalResults,
      summary: {
        resultsFound: finalResults.length
      }
    });

  } catch (error) {
    console.error('Error in scraping:', error);
    broadcastToClients({ 
      type: 'scrape-error', 
      message: `❌ Erreur de scraping: ${error.message}` 
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

// Routes d'authentification
app.get('/admin/login', redirectIfAuthenticated, AuthController.showLogin);
app.post('/admin/login', loginLimiter, AuthController.processLogin);
app.get('/admin/logout', AuthController.logout);

// Routes admin protégées
app.get('/admin/dashboard', requireAuth, requireAdmin, (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Remi - Dashboard Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .nav {
            display: flex;
            gap: 1rem;
        }
        .nav a {
            color: white;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            transition: background 0.3s;
        }
        .nav a:hover { background: rgba(255,255,255,0.2); }
        .nav a.active { background: rgba(255,255,255,0.3); }
        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        .welcome {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            margin-bottom: 2rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Bot Remi Admin</h1>
        <nav class="nav">
            <a href="/admin/dashboard" class="active">Dashboard</a>
            <a href="/admin/cards">Cartes</a>
            <a href="/admin/scraper">Scraper</a>
            <a href="/admin/logout">Déconnexion</a>
        </nav>
    </div>
    
    <div class="container">
        <div class="welcome">
            <h2>Bienvenue, ${req.session.username} !</h2>
            <p>Tableau de bord d'administration du Bot Remi</p>
        </div>
    </div>
</body>
</html>
    `);
});

// Routes cartes
app.get('/admin/cards', requireAuth, requireAdmin, CardsController.showCards);
app.get('/admin/cards/new', requireAuth, requireAdmin, CardsController.showCardForm);
app.get('/admin/cards/:id/edit', requireAuth, requireAdmin, CardsController.showCardForm);
app.get('/admin/scraper', requireAuth, requireAdmin, ScraperController.showScraperPage);

// Routes HTML cartes (pour formulaires avec redirection)
app.post('/admin/cards', requireAuth, requireAdmin, CardsController.createCard);
app.post('/admin/cards/:id', requireAuth, requireAdmin, CardsController.updateCard);

// API cartes (pour AJAX)
app.get('/api/cards', requireAuth, requireAdmin, CardsController.getCards);
app.put('/api/cards/:id', requireAuth, requireAdmin, CardsController.updateCard);
app.delete('/api/cards/:id', requireAuth, requireAdmin, CardsController.deleteCard);
app.post('/api/cards/:id/toggle', requireAuth, requireAdmin, CardsController.toggleCard);

// API scraper tests
app.post('/api/admin/test-discord', requireAuth, requireAdmin, ScraperController.testDiscordAPI);
app.post('/api/admin/test-scraping', requireAuth, requireAdmin, ScraperController.testScrapingAPI);
app.post('/api/admin/full-scraping', requireAuth, requireAdmin, ScraperController.fullScrapingAPI);
app.post('/api/admin/reset-alerts', requireAuth, requireAdmin, ScraperController.resetAlertsAPI);

// Page principale (redirection vers admin)
app.get('/', (req, res) => {
    
    if (req.session && req.session.userId) {
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/admin/login');
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
});