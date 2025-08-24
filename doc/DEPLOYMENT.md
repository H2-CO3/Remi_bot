# 🚀 Déploiement production - Bot Remi

Guide complet pour déployer Bot Remi en production avec surveillance automatique et gestion des processus.

## 📋 Prérequis production

### Serveur recommandé
- **VPS/Serveur dédié** avec accès root/sudo
- **Ubuntu 20.04/22.04** ou **Debian 11+** 
- **2 CPU cores minimum** (Puppeteer + scraping)
- **4 GB RAM minimum** (recommandé: 8 GB)
- **20 GB SSD** minimum

### Sécurité réseau
```bash
# Pare-feu basique
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # Port Bot Remi (à adapter)
```

## 🔧 Configuration production

### 1. Utilisateur dédié

```bash
# Créer un utilisateur pour Bot Remi
sudo useradd -m -s /bin/bash botremi
sudo usermod -aG sudo botremi

# Se connecter avec ce compte
sudo su - botremi
```

### 2. Installation dans /opt

```bash
# Installer Bot Remi dans /opt
sudo mkdir -p /opt/bot-remi
sudo chown botremi:botremi /opt/bot-remi

# Cloner et installer
cd /opt/bot-remi
git clone <repository-url> .
npm install --production
```

### 3. Configuration .env production

```bash
# Créer le .env sécurisé
cp .env.example .env
chmod 600 .env  # Lectures seule pour le propriétaire

# Variables production
cat > .env << 'EOF'
# Environnement
NODE_ENV=production
PORT=3000

# Base de données (sécurisée)
DB_HOST=localhost
DB_USER=botremi_prod
DB_PASSWORD=SuperSecurePasswordProduction2025!
DB_NAME=remi_bot_prod
DB_PORT=3306

# Sécurité (CHANGER CES VALEURS !)
SESSION_SECRET=UltraSecureSessionSecretForProduction2025!RandomString123456
ADMIN_PASSWORD=AdminPasswordSecure2025!Production

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_PRODUCTION_WEBHOOK

# Scraping optimisé production
SCRAPING_DELAY_MIN=3000
SCRAPING_DELAY_MAX=8000
USER_AGENT_ROTATION=true

# Logs
LOG_LEVEL=info
LOG_FILE=/opt/bot-remi/logs/bot-remi.log
EOF
```

### 4. Base de données production

```bash
# Créer utilisateur BDD production
sudo mysql -u root -p << 'SQL'
CREATE DATABASE remi_bot_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'botremi_prod'@'localhost' IDENTIFIED BY 'SuperSecurePasswordProduction2025!';
GRANT ALL PRIVILEGES ON remi_bot_prod.* TO 'botremi_prod'@'localhost';
FLUSH PRIVILEGES;
SQL

# Installer le schéma
mysql -u botremi_prod -p remi_bot_prod < production_final.sql
```

### 5. Structure des logs

```bash
# Créer les répertoires de logs
sudo mkdir -p /var/log/bot-remi
sudo chown botremi:botremi /var/log/bot-remi

# Créer le répertoire logs dans l'app
mkdir -p /opt/bot-remi/logs

# Lien symbolique vers /var/log
ln -sf /var/log/bot-remi /opt/bot-remi/logs/system
```

## 🔄 Gestion des processus avec PM2

### 1. Installation PM2

```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Créer le fichier de configuration
cat > /opt/bot-remi/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'bot-remi-server',
      script: 'src/server.js',
      cwd: '/opt/bot-remi',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      log_file: '/var/log/bot-remi/server.log',
      out_file: '/var/log/bot-remi/server-out.log',
      error_file: '/var/log/bot-remi/server-error.log',
      merge_logs: true,
      time: true
    }
  ]
};
EOF
```

### 2. Démarrage avec PM2

```bash
# Démarrer Bot Remi
pm2 start ecosystem.config.js

# Vérifier le statut
pm2 status

# Voir les logs en temps réel
pm2 logs bot-remi-server

# Sauvegarder la configuration PM2
pm2 save

# Auto-démarrage au boot
pm2 startup
# Exécuter la commande suggérée avec sudo
```

### 3. Commandes PM2 utiles

```bash
# Redémarrer
pm2 restart bot-remi-server

# Arrêter
pm2 stop bot-remi-server

# Recharger (zero-downtime)
pm2 reload bot-remi-server

# Supprimer
pm2 delete bot-remi-server

# Monitoring
pm2 monit
```

## ⏰ Configuration des tâches CRON

### 1. CRON pour scraping automatique

```bash
# Éditer le crontab de l'utilisateur botremi
crontab -e

# Ajouter ces lignes :

# Scraping toutes les 15 minutes
*/15 * * * * cd /opt/bot-remi && npm run scrape >> /var/log/bot-remi/cron-scrape.log 2>&1

# Vérification santé toutes les heures
0 * * * * cd /opt/bot-remi && npm run health >> /var/log/bot-remi/cron-health.log 2>&1

# Nettoyage logs anciens (tous les jours à 2h)
0 2 * * * find /var/log/bot-remi -name "*.log" -mtime +30 -delete

# Test webhook Discord (une fois par jour à 9h)
0 9 * * * cd /opt/bot-remi && npm run test-webhooks >> /var/log/bot-remi/cron-webhook.log 2>&1
```

### 2. Scripts CRON avancés

**Script de monitoring personnalisé :**

```bash
# Créer un script de monitoring
cat > /opt/bot-remi/scripts/monitor.sh << 'EOF'
#!/bin/bash
set -e

LOG_FILE="/var/log/bot-remi/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting monitoring check..." >> $LOG_FILE

# Vérifier que PM2 tourne
if ! pm2 list | grep -q "bot-remi-server.*online"; then
    echo "[$DATE] ERROR: Bot Remi server is down! Restarting..." >> $LOG_FILE
    pm2 restart bot-remi-server
    
    # Envoyer une alerte Discord
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{\"content\": \"🚨 **Bot Remi Server Restart** - Server was down and has been restarted automatically at $DATE\"}" \
         "$DISCORD_WEBHOOK_URL" >> $LOG_FILE 2>&1
fi

# Vérifier l'espace disque
DISK_USAGE=$(df /opt/bot-remi | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
    
    # Nettoyer les vieux logs
    find /var/log/bot-remi -name "*.log" -mtime +7 -delete
fi

echo "[$DATE] Monitoring check completed." >> $LOG_FILE
EOF

# Rendre exécutable
chmod +x /opt/bot-remi/scripts/monitor.sh

# Ajouter au cron (toutes les 5 minutes)
echo "*/5 * * * * /opt/bot-remi/scripts/monitor.sh" | crontab -
```

### 3. CRON de sauvegarde BDD

```bash
# Script de sauvegarde quotidienne
cat > /opt/bot-remi/scripts/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/opt/bot-remi/backups"
DATE=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/remi_bot_backup_$DATE.sql"

# Créer le répertoire si nécessaire
mkdir -p $BACKUP_DIR

# Sauvegarde MySQL
mysqldump -u botremi_prod -p'SuperSecurePasswordProduction2025!' \
          remi_bot_prod > $BACKUP_FILE

# Compresser
gzip $BACKUP_FILE

# Supprimer les sauvegardes de plus de 7 jours
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /opt/bot-remi/scripts/backup.sh

# Sauvegarde quotidienne à 3h du matin
echo "0 3 * * * /opt/bot-remi/scripts/backup.sh >> /var/log/bot-remi/backup.log 2>&1" | crontab -
```

## 🔒 Sécurité production

### 1. Pare-feu avec UFW

```bash
# Configuration restrictive
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH uniquement depuis certaines IPs (adapter)
sudo ufw allow from YOUR_IP_ADDRESS to any port 22

# Bot Remi (si accès externe nécessaire)
sudo ufw allow 3000/tcp

# MySQL (local uniquement)
sudo ufw deny 3306

sudo ufw enable
```

### 2. Reverse proxy avec Nginx

```bash
# Installer Nginx
sudo apt install nginx

# Configuration Bot Remi
sudo cat > /etc/nginx/sites-available/bot-remi << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # À changer

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Sécurité
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options nosniff;
    }
    
    # Logs
    access_log /var/log/nginx/bot-remi.access.log;
    error_log /var/log/nginx/bot-remi.error.log;
}
EOF

# Activer le site
sudo ln -s /etc/nginx/sites-available/bot-remi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL avec Let's Encrypt (optionnel)

```bash
# Installer Certbot
sudo apt install snapd
sudo snap install --classic certbot

# Générer le certificat
sudo certbot --nginx -d your-domain.com
```

## 📊 Monitoring et alertes

### 1. Logs centralisés

```bash
# Configuration rsyslog pour Bot Remi
sudo cat > /etc/rsyslog.d/99-bot-remi.conf << 'EOF'
# Bot Remi logs
if $programname == 'bot-remi' then /var/log/bot-remi/app.log
& stop
EOF

sudo systemctl restart rsyslog
```

### 2. Alertes Discord personnalisées

```bash
# Script d'alerte en cas de problème
cat > /opt/bot-remi/scripts/alert.sh << 'EOF'
#!/bin/bash

WEBHOOK_URL="$1"
MESSAGE="$2"
SEVERITY="${3:-INFO}"

# Couleurs selon la gravité
case $SEVERITY in
    "ERROR") COLOR="16711680" ;;    # Rouge
    "WARNING") COLOR="16776960" ;;  # Jaune  
    "SUCCESS") COLOR="65280" ;;     # Vert
    *) COLOR="3447003" ;;           # Bleu
esac

# Envoyer l'alerte Discord
curl -H "Content-Type: application/json" \
     -X POST \
     -d "{
       \"embeds\": [{
         \"title\": \"🤖 Bot Remi - $SEVERITY\",
         \"description\": \"$MESSAGE\",
         \"color\": $COLOR,
         \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
         \"footer\": {
           \"text\": \"$(hostname)\"
         }
       }]
     }" \
     "$WEBHOOK_URL"
EOF

chmod +x /opt/bot-remi/scripts/alert.sh
```

## 🔄 Maintenance et mises à jour

### 1. Script de mise à jour

```bash
cat > /opt/bot-remi/scripts/update.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Mise à jour Bot Remi..."

# Aller dans le répertoire
cd /opt/bot-remi

# Sauvegarder l'ancienne version
git stash
git pull origin main

# Mise à jour des dépendances
npm ci --production

# Redémarrer les services
pm2 restart bot-remi-server

# Vérifier la santé
sleep 5
npm run health

echo "✅ Mise à jour terminée"
EOF

chmod +x /opt/bot-remi/scripts/update.sh
```

### 2. Rotation des logs

```bash
# Configuration logrotate
sudo cat > /etc/logrotate.d/bot-remi << 'EOF'
/var/log/bot-remi/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 botremi botremi
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## ✅ Validation du déploiement

### Checklist finale

```bash
# 1. Vérifier PM2
pm2 status | grep bot-remi-server

# 2. Vérifier les CRON
crontab -l

# 3. Test de santé complet
cd /opt/bot-remi && npm run health-verbose

# 4. Test webhook
npm run test-webhooks

# 5. Test scraping (dry run)
npm run scrape-dry

# 6. Vérifier les logs
tail -f /var/log/bot-remi/*.log
```

### Métriques à surveiller

- **Uptime PM2** : `pm2 status`
- **Logs d'erreur** : `/var/log/bot-remi/server-error.log`
- **Performance scraping** : Temps de réponse par site
- **Alertes envoyées** : Compteur en base de données
- **Espace disque** : `df -h /opt/bot-remi`

## 🎯 Optimisations production

### Performance
```bash
# Optimiser Node.js en production
export NODE_OPTIONS="--max-old-space-size=2048"

# Augmenter les limites système
sudo cat >> /etc/security/limits.conf << 'EOF'
botremi soft nofile 65536
botremi hard nofile 65536
EOF
```

### Scraping optimisé
```env
# Variables .env pour production
SCRAPING_DELAY_MIN=5000      # 5s minimum (plus respectueux)
SCRAPING_DELAY_MAX=15000     # 15s maximum
USER_AGENT_ROTATION=true     # Rotation obligatoire
```

---

🚀 **Bot Remi est maintenant en production !**

**Surveillance recommandée :**
- Logs en temps réel : `pm2 logs`
- Status services : `pm2 monit`  
- Alertes Discord configurées
- Sauvegardes quotidiennes actives

**Support :** Consultez les logs dans `/var/log/bot-remi/` en cas de problème.