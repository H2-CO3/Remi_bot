# 🔌 API Documentation - Bot Remi

Documentation complète de l'interface web et des endpoints API du Bot Remi.

## 📱 Interface Web

### Accès à l'interface

```
URL : http://localhost:3000
Login : admin
Password : [défini dans .env ADMIN_PASSWORD]
```

### Pages disponibles

- **`/`** - Page d'accueil avec status système
- **`/admin`** - Interface de gestion des cartes
- **`/admin/cards`** - Liste des cartes surveillées  
- **`/admin/cards/new`** - Ajouter une nouvelle carte
- **`/admin/cards/edit/:id`** - Modifier une carte existante
- **`/admin/alerts`** - Historique des alertes envoyées

## 🔐 Authentification

L'interface utilise une **authentification par session** simple.

### Connexion

```http
POST /login
Content-Type: application/x-www-form-urlencoded

password=votre_mot_de_passe
```

**Réponse succès :**
```http
302 Redirect → /admin
Set-Cookie: connect.sid=...
```

**Réponse erreur :**
```http
302 Redirect → /?error=invalid
```

### Déconnexion

```http
POST /logout
```

## 📊 API Endpoints

Tous les endpoints API nécessitent une **session authentifiée**.

### Base URL
```
http://localhost:3000/api
```

---

## 🎯 Gestion des cartes

### GET /api/cards
Récupérer toutes les cartes surveillées.

**Réponse :**
```json
{
  "success": true,
  "cards": [
    {
      "id": 1,
      "name": "Dracaufeu ex",
      "reference": "199/165",
      "max_price": "250.00",
      "active": true,
      "created_at": "2025-08-21T10:30:00.000Z",
      "updated_at": "2025-08-21T10:30:00.000Z"
    }
  ]
}
```

### GET /api/cards/:id
Récupérer une carte spécifique.

**Réponse :**
```json
{
  "success": true,
  "card": {
    "id": 1,
    "name": "Dracaufeu ex",
    "reference": "199/165", 
    "max_price": "250.00",
    "active": true,
    "created_at": "2025-08-21T10:30:00.000Z",
    "updated_at": "2025-08-21T10:30:00.000Z"
  }
}
```

**Erreur 404 :**
```json
{
  "success": false,
  "error": "Carte non trouvée"
}
```

### POST /api/cards
Ajouter une nouvelle carte.

**Requête :**
```json
{
  "name": "Tortank ex",
  "reference": "200/165",
  "max_price": 75.00,
  "active": true
}
```

**Réponse succès :**
```json
{
  "success": true,
  "message": "Carte ajoutée avec succès",
  "card": {
    "id": 2,
    "name": "Tortank ex",
    "reference": "200/165",
    "max_price": "75.00",
    "active": true,
    "created_at": "2025-08-21T11:00:00.000Z",
    "updated_at": "2025-08-21T11:00:00.000Z"
  }
}
```

**Erreur validation :**
```json
{
  "success": false,
  "error": "Le nom est obligatoire"
}
```

### PUT /api/cards/:id
Modifier une carte existante.

**Requête :**
```json
{
  "name": "Dracaufeu ex (Mise à jour)",
  "reference": "199/165",
  "max_price": 200.00,
  "active": false
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Carte mise à jour avec succès",
  "card": {
    "id": 1,
    "name": "Dracaufeu ex (Mise à jour)",
    "reference": "199/165",
    "max_price": "200.00", 
    "active": false,
    "created_at": "2025-08-21T10:30:00.000Z",
    "updated_at": "2025-08-21T11:15:00.000Z"
  }
}
```

### DELETE /api/cards/:id
Supprimer une carte.

**Réponse :**
```json
{
  "success": true,
  "message": "Carte supprimée avec succès"
}
```

---

## 🚨 Historique des alertes

### GET /api/alerts
Récupérer l'historique des alertes.

**Paramètres query (optionnels) :**
- `limit` - Nombre d'alertes (défaut: 100)
- `offset` - Décalage pour pagination (défaut: 0)
- `site` - Filtrer par site (vinted, ebay, etc.)

**Exemple :**
```
GET /api/alerts?limit=50&site=vinted
```

**Réponse :**
```json
{
  "success": true,
  "alerts": [
    {
      "id": 1,
      "card_reference_id": 1,
      "site": "vinted",
      "product_link": "https://vinted.fr/items/123456789",
      "title": "Carte Dracaufeu ex 199/165 Excellent État",
      "price": "180.00",
      "sent_at": "2025-08-21T14:30:00.000Z"
    }
  ],
  "total": 1,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### GET /api/alerts/stats
Statistiques des alertes.

**Réponse :**
```json
{
  "success": true,
  "stats": {
    "total_alerts": 45,
    "alerts_today": 3,
    "alerts_this_week": 12,
    "by_site": {
      "vinted": 20,
      "ebay": 15,
      "leboncoin": 8,
      "cardmarket": 2
    },
    "by_card": [
      {
        "card_name": "Dracaufeu ex",
        "reference": "199/165",
        "alert_count": 8
      }
    ]
  }
}
```

---

## 🔧 Outils et utilitaires

### POST /api/scraping/test
Lancer un test de scraping.

**Requête :**
```json
{
  "card_id": 1,
  "dry_run": true
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Test de scraping lancé",
  "results": [
    {
      "site": "vinted",
      "results_count": 5,
      "alerts_sent": 0,
      "execution_time": 3500
    }
  ]
}
```

### POST /api/discord/test
Tester le webhook Discord.

**Réponse :**
```json
{
  "success": true,
  "message": "Message de test envoyé sur Discord"
}
```

### GET /api/health
État de santé du système.

**Réponse :**
```json
{
  "success": true,
  "health": {
    "database": "ok",
    "discord_webhook": "ok", 
    "scrapers": {
      "vinted": "ok",
      "ebay": "ok",
      "leboncoin": "ok",
      "cardmarket": "ok"
    },
    "uptime": "2h 35m",
    "memory_usage": "45%",
    "last_scraping": "2025-08-21T14:45:00.000Z"
  }
}
```

---

## 🎨 Interface WebSocket (Temps réel)

### Connexion WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connexion WebSocket établie');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Mise à jour reçue:', data);
};
```

### Messages WebSocket

**Nouvelle alerte :**
```json
{
  "type": "new_alert",
  "data": {
    "id": 45,
    "card_name": "Dracaufeu ex",
    "site": "vinted",
    "price": "180.00",
    "link": "https://vinted.fr/items/123456789"
  }
}
```

**Démarrage scraping :**
```json
{
  "type": "scraping_started",
  "data": {
    "cards_count": 3,
    "sites": ["vinted", "ebay", "leboncoin", "cardmarket"]
  }
}
```

**Scraping terminé :**
```json
{
  "type": "scraping_completed", 
  "data": {
    "total_results": 23,
    "alerts_sent": 2,
    "execution_time": 45000,
    "next_run": "2025-08-21T15:30:00.000Z"
  }
}
```

---

## 🛡️ Codes d'erreur

### Erreurs d'authentification
- **401 Unauthorized** - Session non valide ou expirée
- **403 Forbidden** - Accès refusé

### Erreurs de validation  
- **400 Bad Request** - Données manquantes ou invalides
- **422 Unprocessable Entity** - Validation échouée

### Erreurs système
- **500 Internal Server Error** - Erreur serveur
- **503 Service Unavailable** - Service temporairement indisponible

### Format d'erreur standard
```json
{
  "success": false,
  "error": "Message d'erreur descriptif",
  "code": "ERROR_CODE",
  "details": {
    "field": "Détail de l'erreur"
  }
}
```

---

## 📝 Validation des données

### Carte (POST/PUT /api/cards)

```javascript
{
  "name": {
    "required": true,
    "type": "string",
    "max_length": 255,
    "example": "Dracaufeu ex"
  },
  "reference": {
    "required": true,
    "type": "string", 
    "max_length": 255,
    "pattern": "^[0-9/A-Za-z]+$",
    "example": "199/165"
  },
  "max_price": {
    "required": true,
    "type": "number",
    "min": 0.01,
    "max": 9999.99,
    "decimal_places": 2,
    "example": 250.00
  },
  "active": {
    "required": false,
    "type": "boolean",
    "default": true
  }
}
```

---

## 🚀 Exemples d'utilisation

### JavaScript (fetch)

```javascript
// Récupérer les cartes
const response = await fetch('/api/cards', {
  credentials: 'include' // Important pour les sessions
});
const data = await response.json();

// Ajouter une carte
const newCard = await fetch('/api/cards', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    name: 'Pikachu GX',
    reference: '20/73',
    max_price: 15.00
  })
});
```

### cURL

```bash
# Se connecter
curl -c cookies.txt -X POST \
  http://localhost:3000/login \
  -d 'password=votre_mot_de_passe'

# Récupérer les cartes
curl -b cookies.txt \
  http://localhost:3000/api/cards

# Ajouter une carte
curl -b cookies.txt \
  -H 'Content-Type: application/json' \
  -X POST \
  http://localhost:3000/api/cards \
  -d '{
    "name": "Pikachu GX",
    "reference": "20/73", 
    "max_price": 15.00
  }'
```

---

## 📊 Logs et monitoring

### Logs d'accès API

Les logs d'API sont disponibles dans :
- **Fichier** : `logs/api-access.log`
- **Format** : `[timestamp] [method] [endpoint] [status] [response_time]`

Exemple :
```
[2025-08-21T15:30:25.123Z] [GET] [/api/cards] [200] [45ms]
[2025-08-21T15:30:30.456Z] [POST] [/api/cards] [201] [120ms]
```

### Métriques disponibles

- **Requêtes par endpoint** : Compteur par route API
- **Temps de réponse moyen** : Performance par endpoint  
- **Taux d'erreur** : Pourcentage d'erreurs HTTP 4xx/5xx
- **Sessions actives** : Nombre d'utilisateurs connectés
- **WebSocket connections** : Connexions temps réel actives

---

🔌 **API Bot Remi prête à l'emploi !**

**Interface web :** http://localhost:3000  
**Documentation interactive :** Disponible dans l'interface à `/admin/api`