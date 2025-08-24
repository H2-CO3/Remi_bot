# Bot Remi - Scraper Pokemon Cards

🤖 **Bot automatisé de surveillance des prix de cartes Pokemon** avec alertes Discord en temps réel.

## 📋 Description

Bot Remi surveille automatiquement les prix des cartes Pokemon sur plusieurs sites de vente d'occasion et envoie des alertes Discord quand il trouve des offres intéressantes en dessous des seuils configurés.

### 🎯 Sites supportés
- **Vinted** - Cartes d'occasion entre particuliers
- **eBay** - Enchères et ventes immédiates  
- **Le Bon Coin** - Annonces locales
- **CardMarket** - Spécialisé cartes à collectionner

### ✨ Fonctionnalités principales
- 🔍 **Scraping multi-sites** avec anti-détection avancé
- 🚨 **Alertes Discord** instantanées avec liens directs
- 🎯 **Filtrage intelligent** par référence et prix
- 🌐 **Interface web** de gestion des cartes
- 📊 **Anti-doublon** automatique (une URL = une alerte)
- ⚡ **Scraping séquentiel** pour éviter la détection
- 🔄 **Rotation User-Agent** et délais aléatoires

## 🚀 Installation rapide

```bash
# 1. Cloner le projet
git clone <repo-url>
cd bot_remi

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer le fichier .env avec vos paramètres

# 4. Installer la base de données
npm run setup-db

# 5. Démarrer le serveur
npm start
```

**Interface web** : http://localhost:3000

## 📚 Documentation complète

- [📦 Installation détaillée](INSTALLATION.md) - Configuration complète étape par étape
- [🚀 Déploiement production](DEPLOYMENT.md) - Mise en production avec crons
- [🔌 API Documentation](API.md) - Interface web et endpoints

## ⚡ Commandes principales

```bash
# Serveur et développement
npm start           # Démarrer le serveur web
npm run dev         # Mode développement avec auto-reload

# Base de données  
npm run setup-db    # Installer/réinitialiser la base
npm run fix-db      # Corriger les problèmes de BDD

# Scraping
npm run scrape      # Lancer le scraping automatique
npm run scrape-dry  # Test sans envoi Discord
npm run scrape-summary  # Afficher un résumé

# Outils
npm run health      # Vérifier le système
npm run test-webhooks  # Tester Discord
```

## 🏗️ Architecture technique

```
Bot Remi
├── Interface Web (Express.js)
│   ├── Gestion des cartes (/admin)
│   └── API REST (/api)
├── Système de scraping
│   ├── ScraperFactory (création unifiée)
│   ├── Scrapers spécialisés par site
│   └── UnifiedScrapingService (orchestration)
├── Base de données (MySQL/MariaDB)
│   ├── card_references (cartes à surveiller)
│   └── sent_alerts (historique alertes)
└── Notifications Discord (webhooks)
```

## 🔧 Configuration

### Variables d'environnement (.env)
```bash
# Base de données
DB_HOST=localhost
DB_USER=botremi
DB_PASSWORD=votre_mot_de_passe
DB_NAME=remi_bot

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Sécurité
SESSION_SECRET=votre_session_secret
ADMIN_PASSWORD=votre_mot_de_passe_admin
```

### Exemple de carte surveillée
```javascript
{
  "name": "Dracaufeu ex",
  "reference": "199/165", 
  "max_price": 250.00,
  "active": true
}
```

## 🚨 Système d'alertes

Quand une carte est trouvée sous le seuil :

```
🔥 BONNE AFFAIRE DÉTECTÉE !

🎯 Carte: Dracaufeu ex 199/165
💰 Prix: 180.00€ (seuil: 250.00€)
🏪 Site: vinted
🔗 Lien: https://vinted.fr/items/...

⏰ 21/08/2025 à 15:30
🤖 Bot Remi
```

## 📊 Anti-doublon intelligent

- **Une URL = une seule alerte** (pas de spam)
- **Nettoyage URLs eBay** (paramètres variables ignorés)
- **Historique complet** en base de données

## 🛡️ Sécurité et anti-détection

- **Rotation User-Agent** automatique
- **Délais aléatoires** entre requêtes  
- **Headers réalistes** par site
- **Puppeteer** pour sites JavaScript
- **Scraping séquentiel** site par site

## 📈 Surveillance automatique

```bash
# Cron toutes les 15 minutes
*/15 * * * * cd /chemin/bot_remi && npm run scrape

# Ou via PM2
pm2 start ecosystem.config.js
```

## 🔍 Debugging

```bash
# Vérifier le système
npm run health-verbose

# Logs détaillés
tail -f logs/bot-remi.log

# Test d'un seul scraping
npm run scrape-dry
```

## 🏷️ Version et Support

- **Version** : 1.0.0
- **Node.js** : >= 18.0.0
- **Base de données** : MySQL 8.0+ / MariaDB 10.6+
- **Navigateur** : Puppeteer (auto-installé)

## 📄 License

ISC - Projet personnel

---

**⚠️ Usage responsable** : Respectez les conditions d'utilisation des sites scrapés et utilisez des délais raisonnables.

🤖 Bot développé avec ❤️ pour la communauté Pokemon