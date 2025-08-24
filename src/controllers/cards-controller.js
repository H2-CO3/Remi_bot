import { CardService } from '../services/card-service.js';

export class CardsController {
    
    /**
     * Afficher la liste des cartes
     */
    static async showCards(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const search = req.query.search || '';
            
            const result = await CardService.getAllCards(page, 20, search);
            const stats = await CardService.getCardsStats();
            
            res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Remi - Gestion des Cartes</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
            line-height: 1.6;
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
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        .card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .card-header {
            background: #f8f9fa;
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .search-form {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .search-form input {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 0.9rem;
            transition: all 0.3s;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-warning {
            background: #ffc107;
            color: #212529;
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        .status-active {
            color: #28a745;
            font-weight: bold;
        }
        .status-inactive {
            color: #dc3545;
            font-weight: bold;
        }
        .pagination {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 1rem;
            padding: 1rem;
        }
        .pagination a {
            padding: 0.5rem 1rem;
            background: white;
            border: 1px solid #dee2e6;
            color: #667eea;
            text-decoration: none;
            border-radius: 5px;
        }
        .pagination a:hover {
            background: #667eea;
            color: white;
        }
        .pagination .active {
            background: #667eea;
            color: white;
        }
        .actions {
            display: flex;
            gap: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Bot Remi Admin</h1>
        <nav class="nav">
            <a href="/admin/dashboard">Dashboard</a>
            <a href="/admin/cards" class="active">Cartes</a>
            <a href="/admin/scraper">Scraper</a>
            <a href="/admin/logout">Déconnexion</a>
        </nav>
    </div>
    
    <div class="container">
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${stats.total_cards}</div>
                <div>Total cartes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.active_cards}</div>
                <div>Cartes actives</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Number(stats.avg_max_price || 0).toFixed(2)}€</div>
                <div>Prix moyen</div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Gestion des Cartes Pokemon</h2>
                <a href="/admin/cards/new" class="btn btn-primary">+ Nouvelle carte</a>
            </div>
            
            <div style="padding: 1.5rem;">
                <form class="search-form" method="GET">
                    <input type="text" name="search" placeholder="Rechercher une carte..." value="${search}">
                    <input type="hidden" name="page" value="1">
                    <button type="submit" class="btn btn-primary">Rechercher</button>
                    ${search ? '<a href="/admin/cards" class="btn btn-warning">Effacer</a>' : ''}
                </form>
                
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Référence</th>
                            <th>Prix max</th>
                            <th>Statut</th>
                            <th>Créée le</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.cards.map(card => `
                            <tr>
                                <td><strong>${card.name}</strong></td>
                                <td><code>${card.reference}</code></td>
                                <td><strong>${card.max_price}€</strong></td>
                                <td class="${card.active ? 'status-active' : 'status-inactive'}">
                                    ${card.active ? '✅ Active' : '❌ Inactive'}
                                </td>
                                <td>${new Date(card.created_at).toLocaleDateString('fr-FR')}</td>
                                <td>
                                    <div class="actions">
                                        <a href="/admin/cards/${card.id}/edit" class="btn btn-warning">Éditer</a>
                                        <button onclick="toggleCard(${card.id})" class="btn ${card.active ? 'btn-warning' : 'btn-success'}">
                                            ${card.active ? 'Désactiver' : 'Activer'}
                                        </button>
                                        <button onclick="deleteCard(${card.id}, '${card.name}')" class="btn btn-danger">Supprimer</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                ${result.cards.length === 0 ? `
                    <div style="text-align: center; padding: 3rem; color: #6c757d;">
                        <h3>Aucune carte trouvée</h3>
                        <p>Commencez par ajouter une nouvelle carte à surveiller.</p>
                    </div>
                ` : ''}
                
                ${result.pagination.totalPages > 1 ? `
                    <div class="pagination">
                        ${result.pagination.hasPrev ? `<a href="?page=${result.pagination.page - 1}&search=${search}">« Précédent</a>` : ''}
                        ${Array.from({length: result.pagination.totalPages}, (_, i) => i + 1).map(pageNum => `
                            <a href="?page=${pageNum}&search=${search}" 
                               class="${pageNum === result.pagination.page ? 'active' : ''}">${pageNum}</a>
                        `).join('')}
                        ${result.pagination.hasNext ? `<a href="?page=${result.pagination.page + 1}&search=${search}">Suivant »</a>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    </div>
    
    <script>
        async function toggleCard(id) {
            if (confirm('Êtes-vous sûr de vouloir changer le statut de cette carte ?')) {
                try {
                    const response = await fetch(\`/api/cards/\${id}/toggle\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (response.ok) {
                        location.reload();
                    } else {
                        alert('Erreur lors de la modification du statut');
                    }
                } catch (error) {
                    alert('Erreur: ' + error.message);
                }
            }
        }
        
        async function deleteCard(id, name) {
            if (confirm(\`Êtes-vous sûr de vouloir supprimer la carte "\${name}" ?\\nCette action est irréversible.\`)) {
                try {
                    const response = await fetch(\`/api/cards/\${id}\`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (response.ok) {
                        location.reload();
                    } else {
                        alert('Erreur lors de la suppression');
                    }
                } catch (error) {
                    alert('Erreur: ' + error.message);
                }
            }
        }
    </script>
</body>
</html>
            `);
        } catch (error) {
            console.error('Show cards error:', error);
            res.status(500).send('Erreur lors du chargement des cartes');
        }
    }
    
    /**
     * Afficher le formulaire d'ajout/édition
     */
    static async showCardForm(req, res) {
        try {
            const cardId = req.params.id;
            let card = null;
            let isEdit = false;
            
            if (cardId && cardId !== 'new') {
                card = await CardService.getCardById(cardId);
                if (!card) {
                    return res.status(404).send('Carte non trouvée');
                }
                isEdit = true;
            }
            
            res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Remi - ${isEdit ? 'Éditer' : 'Nouvelle'} Carte</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
            line-height: 1.6;
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
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        .card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .card-header {
            background: #f8f9fa;
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #495057;
        }
        input, select, textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e9ecef;
            border-radius: 5px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 1rem;
            transition: all 0.3s;
            margin-right: 1rem;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .help-text {
            font-size: 0.875rem;
            color: #6c757d;
            margin-top: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Bot Remi Admin</h1>
        <nav class="nav">
            <a href="/admin/dashboard">Dashboard</a>
            <a href="/admin/cards" class="active">Cartes</a>
            <a href="/admin/scraper">Scraper</a>
            <a href="/admin/logout">Déconnexion</a>
        </nav>
    </div>
    
    <div class="container">
        <div class="card">
            <div class="card-header">
                <h2>${isEdit ? 'Éditer la carte' : 'Nouvelle carte'}</h2>
            </div>
            
            <div style="padding: 2rem;">
                <form method="POST" action="/admin/cards${isEdit ? '/' + card.id : ''}">
                    ${isEdit ? '<input type="hidden" name="_method" value="PUT">' : ''}
                    
                    <div class="form-group">
                        <label for="name">Nom de la carte *</label>
                        <input type="text" id="name" name="name" required 
                               value="${card ? card.name : ''}"
                               placeholder="ex: Dracaufeu ex">
                        <div class="help-text">Nom descriptif de la carte Pokemon</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="reference">Référence *</label>
                        <input type="text" id="reference" name="reference" required 
                               value="${card ? card.reference : ''}"
                               placeholder="ex: 199/165 ou magneton svp 159">
                        <div class="help-text">Référence exacte à rechercher (numéro, nom, etc.)</div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="max_price">Prix maximum (€) *</label>
                            <input type="number" id="max_price" name="max_price" required 
                                   step="0.01" min="0.01"
                                   value="${card ? card.max_price : ''}"
                                   placeholder="250.00">
                            <div class="help-text">Prix maximum pour déclencher une alerte</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="active">Statut</label>
                            <select id="active" name="active">
                                <option value="1" ${card && card.active ? 'selected' : ''}>Active</option>
                                <option value="0" ${card && !card.active ? 'selected' : ''}>Inactive</option>
                            </select>
                            <div class="help-text">Surveillance active ou pas</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 2rem;">
                        <button type="submit" class="btn btn-primary">
                            ${isEdit ? 'Mettre à jour' : 'Créer la carte'}
                        </button>
                        <a href="/admin/cards" class="btn btn-secondary">Annuler</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
            `);
        } catch (error) {
            console.error('Show card form error:', error);
            res.status(500).send('Erreur lors du chargement du formulaire');
        }
    }
    
    /**
     * API: Créer une carte
     */
    static async createCard(req, res) {
        try {
            const card = await CardService.createCard(req.body);
            
            if (req.path.startsWith('/api/')) {
                res.json({ success: true, card });
            } else {
                res.redirect('/admin/cards?created=1');
            }
        } catch (error) {
            console.error('Create card error:', error);
            
            if (req.path.startsWith('/api/')) {
                res.status(400).json({ success: false, message: error.message });
            } else {
                res.status(400).send(`Erreur: ${error.message}`);
            }
        }
    }
    
    /**
     * API: Mettre à jour une carte
     */
    static async updateCard(req, res) {
        try {
            const card = await CardService.updateCard(req.params.id, req.body);
            
            if (req.path.startsWith('/api/')) {
                res.json({ success: true, card });
            } else {
                res.redirect('/admin/cards?updated=1');
            }
        } catch (error) {
            console.error('Update card error:', error);
            
            if (req.path.startsWith('/api/')) {
                res.status(400).json({ success: false, message: error.message });
            } else {
                res.status(400).send(`Erreur: ${error.message}`);
            }
        }
    }
    
    /**
     * API: Supprimer une carte
     */
    static async deleteCard(req, res) {
        try {
            await CardService.deleteCard(req.params.id);
            res.json({ success: true });
        } catch (error) {
            console.error('Delete card error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    
    /**
     * API: Toggle statut carte
     */
    static async toggleCard(req, res) {
        try {
            const newStatus = await CardService.toggleCardStatus(req.params.id);
            res.json({ success: true, active: newStatus });
        } catch (error) {
            console.error('Toggle card error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    
    /**
     * API: Récupérer toutes les cartes
     */
    static async getCards(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const search = req.query.search || '';
            
            const result = await CardService.getAllCards(page, 20, search);
            res.json({ success: true, ...result });
        } catch (error) {
            console.error('Get cards API error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}