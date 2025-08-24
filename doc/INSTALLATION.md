# 📦 Installation complète - Bot Remi

Guide détaillé d'installation et de configuration du Bot Remi pour la surveillance des cartes Pokemon.

## 📋 Prérequis système

### Système d'exploitation
- **Linux** (Ubuntu 20.04+, Debian 11+) ✅ Recommandé
- **macOS** (10.15+) ✅ Supporté  
- **Windows** (10/11) ⚠️ Supporté avec WSL

### Logiciels requis

```bash
# Node.js (version 18 minimum)
node --version  # >= 18.0.0
npm --version   # >= 8.0.0

# MySQL ou MariaDB
mysql --version     # MySQL 8.0+
# OU
mariadb --version   # MariaDB 10.6+

# Git
git --version
```

### Installation des prérequis

#### Ubuntu/Debian
```bash
# Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MariaDB
sudo apt update
sudo apt install -y mariadb-server mariadb-client

# Dépendances système pour Puppeteer
sudo apt install -y chromium-browser
```

#### macOS (avec Homebrew)
```bash
# Node.js
brew install node@18

# MySQL
brew install mysql
brew services start mysql
```

## 🚀 Installation Bot Remi

### 1. Récupération du code

```bash
# Cloner le repository
git clone <repository-url>
cd bot_remi

# Vérifier la structure
ls -la
```

### 2. Installation des dépendances

```bash
# Installer les packages npm
npm install

# Vérifier l'installation
npm list --depth=0
```

**Packages principaux installés :**
- `puppeteer` - Automatisation navigateur
- `express` - Serveur web  
- `mysql2` - Connexion MySQL/MariaDB
- `cheerio` - Parsing HTML
- `axios` - Requêtes HTTP

## 🗄️ Configuration base de données

### 1. Préparer MySQL/MariaDB

```bash
# Se connecter à MySQL/MariaDB
sudo mysql -u root -p

# Créer l'utilisateur Bot Remi
CREATE USER 'botremi'@'localhost' IDENTIFIED BY 'BotRemi2025!DbSecure#Pass';
GRANT ALL PRIVILEGES ON *.* TO 'botremi'@'localhost';
FLUSH PRIVILEGES;
exit;
```

### 2. Installer le schéma de base

```bash
# Utiliser le script automatique
npm run setup-db

# OU manuellement
mysql -u botremi -p < production_final.sql
```

### 3. Vérifier l'installation

```bash
# Se connecter à la base
mysql -u botremi -p remi_bot

# Vérifier les tables
SHOW TABLES;
/*
Attendu :
- card_references
- login_attempts  
- scraping_logs
- sent_alerts
- users
*/

# Vérifier les données exemple
SELECT * FROM card_references;
exit;
```

## ⚙️ Configuration environnement

### 1. Créer le fichier .env

```bash
# Copier le template
cp .env.example .env

# Éditer avec vos paramètres
nano .env  # ou vim, code, etc.
```

### 2. Variables obligatoires

```bash
# === BASE DE DONNÉES ===
DB_HOST=localhost
DB_USER=botremi
DB_PASSWORD=BotRemi2025!DbSecure#Pass  # À changer !
DB_NAME=remi_bot
DB_PORT=3306

# === SÉCURITÉ ===
SESSION_SECRET=VotreSessionSecretUltraSecurisee123!  # À changer !
ADMIN_PASSWORD=VotreMotDePasseAdmin2025!             # À changer !

# === DISCORD (obligatoire) ===
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE

# === ENVIRONNEMENT ===
NODE_ENV=production
PORT=3000
```

### 3. Configuration Discord

#### Créer un webhook Discord

1. **Aller sur votre serveur Discord**
2. **Paramètres du salon** → Intégrations → Webhooks
3. **"Nouveau Webhook"**
4. **Nommer** : "Bot Remi Alerts" 
5. **Copier l'URL** et la mettre dans `.env`

#### Tester le webhook

```bash
npm run test-webhooks
```

Vous devriez recevoir un message de test sur Discord.

## 🔧 Configuration avancée

### Variables optionnelles (.env)

```bash
# === SCRAPING ===
USER_AGENT_ROTATION=true
SCRAPING_DELAY_MIN=2000    # 2 secondes minimum
SCRAPING_DELAY_MAX=5000    # 5 secondes maximum

# === LOGS ===
LOG_LEVEL=info             # debug, info, warn, error
LOG_FILE=logs/bot-remi.log

# === SÉCURITÉ ===
RATE_LIMIT_WINDOW=900000   # 15 minutes
RATE_LIMIT_MAX=100         # 100 requêtes max
```

### Personnaliser les seuils de prix

Les seuils sont dans la base de données. Modifiez via l'interface web ou SQL :

```sql
# Exemples de cartes à surveiller
INSERT INTO card_references (name, reference, max_price) VALUES 
('Dracaufeu ex', '199/165', 250.00),
('Tortank ex', '200/165', 75.00),
('Florizarre ex', '198/165', 75.00);
```

## 🧪 Tests et validation

### 1. Test complet du système

```bash
# Vérifier tous les composants
npm run health-verbose
```

**Sortie attendue :**
```
✅ Configuration environnement
✅ Connexion base de données  
✅ Webhook Discord
✅ Scrapers disponibles
✅ Interface web accessible
```

### 2. Test de scraping

```bash
# Test sans envoi Discord
npm run scrape-dry

# Scraping réel (1 fois)
npm run scrape
```

### 3. Test interface web

```bash
# Démarrer le serveur
npm start

# Aller sur http://localhost:3000
# Login : admin / VotreMotDePasseAdmin2025!
```

## 📁 Structure finale

```
bot_remi/
├── 📄 Configuration
│   ├── .env                    # Variables d'environnement
│   ├── production_final.sql    # Schéma base de données
│   └── package.json           # Dépendances npm
├── 🗂️ Code source
│   ├── src/
│   │   ├── scrapers/          # Scrapers par site
│   │   ├── services/          # Logique métier
│   │   ├── controllers/       # API endpoints
│   │   └── public/            # Interface web
│   └── bin/                   # Scripts CLI
├── 📊 Données
│   └── logs/                  # Fichiers de logs
└── 📚 Documentation
    ├── README.md
    ├── INSTALLATION.md         # Ce fichier
    ├── DEPLOYMENT.md
    └── API.md
```

## 🔍 Résolution de problèmes

### Erreur de connexion MySQL

```bash
# Vérifier le service
sudo systemctl status mysql    # ou mariadb

# Redémarrer si nécessaire  
sudo systemctl restart mysql

# Vérifier les credentials
mysql -u botremi -p -e "SELECT 1;"
```

### Puppeteer ne s'installe pas

```bash
# Installer les dépendances système manquantes (Ubuntu)
sudo apt install -y gconf-service libasound2 libatk1.0-0 \
  libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
  libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 \
  libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 \
  libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 ca-certificates fonts-liberation

# Réinstaller Puppeteer
npm rebuild puppeteer
```

### Webhook Discord ne fonctionne pas

```bash
# Vérifier l'URL dans .env
echo $DISCORD_WEBHOOK_URL

# Tester manuellement avec curl
curl -H "Content-Type: application/json" \
     -X POST \
     -d '{"content": "Test Bot Remi"}' \
     YOUR_WEBHOOK_URL
```

### Permissions fichiers

```bash
# Donner les permissions au dossier logs
mkdir -p logs
chmod 755 logs

# Permissions d'exécution sur les scripts bin/
chmod +x bin/*.js
```

## ✅ Installation réussie

Si tous les tests passent :

1. ✅ **Base de données** : Connectée et schéma installé
2. ✅ **Discord** : Webhook configuré et testé  
3. ✅ **Scraping** : Au moins un scraper fonctionne
4. ✅ **Interface web** : Accessible sur http://localhost:3000
5. ✅ **Logs** : Fichiers créés dans `logs/`

**🎉 Votre Bot Remi est prêt !**

**Prochaines étapes :**
- [🚀 Guide de déploiement](DEPLOYMENT.md) pour la production
- [🔌 Documentation API](API.md) pour l'interface web
- Configuration du scraping automatique (crons)

---

💡 **Besoin d'aide ?** Vérifiez les logs dans `logs/bot-remi.log` ou lancez `npm run health-verbose` pour diagnostiquer les problèmes.