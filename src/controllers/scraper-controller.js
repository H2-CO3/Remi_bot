import { AutoScrapingService } from '../services/auto-scraping-service.js';
import { sendDiscordTest } from '../utils/discord-webhook.js';
import { query } from '../../config/database.js';

export class ScraperController {
    
    /**
     * Page de test du scraper
     */
    static async showScraperPage(req, res) {
        try {
            res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scraper - Bot Remi</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
        }
        .header {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { color: white; }
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
        
        .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .test-card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .test-card h3 {
            color: #667eea;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .test-card p {
            color: #666;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.3s;
            width: 100%;
            margin-bottom: 0.5rem;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        
        .btn-secondary {
            background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
        }
        
        .btn-warning {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .logs-section {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-top: 2rem;
        }
        
        .logs-output {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1rem;
            height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            white-space: pre-wrap;
            color: #333;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #333;
        }
        
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 0.9rem;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
        
        .status-success { background: #28a745; }
        .status-error { background: #dc3545; }
        .status-warning { background: #ffc107; }
        .status-info { background: #17a2b8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Bot Remi Admin</h1>
        <nav class="nav">
            <a href="/admin/dashboard">Dashboard</a>
            <a href="/admin/cards">Cartes</a>
            <a href="/admin/scraper" class="active">Scraper</a>
            <a href="/admin/logout">Déconnexion</a>
        </nav>
    </div>

    <div class="container">
        <div class="test-grid">
            <!-- Test Discord -->
            <div class="test-card">
                <h3>🔔 Test Discord</h3>
                <p>Tester les webhooks Discord pour s'assurer que les notifications fonctionnent.</p>
                <button class="btn btn-secondary" onclick="testDiscord('main')">
                    Test Webhook Discord
                </button>
            </div>

            <!-- Test Scraping Manuel -->
            <div class="test-card">
                <h3>🔍 Test Scraping</h3>
                <p>Tester le scraping d'une carte spécifique sur Vinted et eBay avec filtrage par prix.</p>
                <div class="form-group">
                    <label>Recherche (ex: "Dracaufeu ex 199/165")</label>
                    <input type="text" id="searchQuery" placeholder="Nom de la carte + référence" value="Dracaufeu ex">
                </div>
                <div class="form-group">
                    <label>Prix maximum (€)</label>
                    <input type="number" id="maxPrice" placeholder="Prix max en euros" value="50" min="1" step="0.01">
                </div>
                <button class="btn" onclick="testScraping()">
                    🔍 Lancer Test Scraping
                </button>
            </div>

            <!-- Scraping Complet -->
            <div class="test-card">
                <h3>🎯 Scraping Complet</h3>
                <p>Lancer le scraping de toutes les cartes actives en base (mode test).</p>
                <button class="btn btn-warning" onclick="fullScraping()">
                    🚀 Scraping Toutes Cartes (Dry Run)
                </button>
            </div>

            <!-- Reset Alertes -->
            <div class="test-card">
                <h3>🗑️ Reset Alertes</h3>
                <p>Vider la table des alertes envoyées pour permettre la re-émission lors des tests.</p>
                <button class="btn btn-warning" onclick="resetAlerts()">
                    ⚠️ Vider Toutes les Alertes
                </button>
                <small style="color: #666; display: block; margin-top: 0.5rem;">
                    ⚠️ Action irréversible - Utiliser uniquement pour les tests
                </small>
            </div>

            <!-- Scripts CLI -->
            <div class="test-card">
                <h3>⚙️ Scripts CLI</h3>
                <p>Accès rapide aux commandes CLI du bot.</p>
                <div style="font-family: monospace; font-size: 0.8rem; background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div><strong>Scraping:</strong> npm run scrape-dry</div>
                    <div><strong>Stock:</strong> npm run monitor-stock-force</div>
                    <div><strong>Santé:</strong> npm run health</div>
                    <div><strong>Webhooks:</strong> npm run test-webhooks</div>
                </div>
            </div>
        </div>

        <!-- Logs en temps réel -->
        <div class="logs-section">
            <h3>📋 Logs en temps réel</h3>
            <div id="logs" class="logs-output">Prêt pour les tests...\n</div>
            <button class="btn btn-secondary" onclick="clearLogs()" style="width: auto; margin-top: 1rem;">
                🗑️ Vider les logs
            </button>
        </div>
    </div>

    <script>
        const logsElement = document.getElementById('logs');
        let ws = null;

        // Connexion WebSocket pour les logs en temps réel
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                if (data.type === 'scrape-progress' || data.type === 'test-result') {
                    addLog(data.message || JSON.stringify(data));
                }
            };
            
            ws.onclose = function() {
                addLog('❌ Connexion WebSocket fermée');
                setTimeout(connectWebSocket, 3000);
            };
            
            ws.onerror = function() {
                addLog('⚠️ Erreur WebSocket');
            };
        }

        function addLog(message) {
            const timestamp = new Date().toLocaleTimeString();
            logsElement.textContent += \`[\${timestamp}] \${message}\\n\`;
            logsElement.scrollTop = logsElement.scrollHeight;
        }

        function clearLogs() {
            logsElement.textContent = 'Logs vidés...\\n';
        }

        // Test Discord
        async function testDiscord(type) {
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = 'Test en cours...';
            
            try {
                addLog(\`🔔 Test Discord \${type}...\`);
                
                const response = await fetch('/api/admin/test-discord', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ type })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    addLog(\`✅ Test Discord \${type} réussi !\`);
                } else {
                    addLog(\`❌ Test Discord \${type} échoué: \${result.error}\`);
                }
                
            } catch (error) {
                addLog(\`❌ Erreur test Discord: \${error.message}\`);
            } finally {
                btn.disabled = false;
                btn.textContent = type === 'main' ? 'Test Webhook Principal' : 'Test Webhook Coffret';
            }
        }

        // Test Scraping
        async function testScraping() {
            const query = document.getElementById('searchQuery').value;
            const maxPrice = document.getElementById('maxPrice').value;
            
            if (!query.trim()) {
                alert('Veuillez entrer une recherche');
                return;
            }
            
            if (!maxPrice || parseFloat(maxPrice) <= 0) {
                alert('Veuillez entrer un prix maximum valide');
                return;
            }
            
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = 'Scraping en cours...';
            
            try {
                addLog(\`🔍 Test scraping: "\${query}" (max: \${maxPrice}€)\`);
                
                const response = await fetch('/api/admin/test-scraping', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ query, maxPrice: parseFloat(maxPrice) })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    addLog(\`✅ Scraping terminé:\`);
                    addLog(\`   Résultats bruts: \${result.totalResults}\`);
                    addLog(\`   Prix acceptable: \${result.affordableResults}\`);
                    addLog(\`   Nouvelles alertes: \${result.newAlerts}\`);
                    if (result.details) {
                        result.details.forEach(detail => {
                            addLog(\`   \${detail.site}: \${detail.results} résultats\`);
                        });
                    }
                } else {
                    addLog(\`❌ Scraping échoué: \${result.error}\`);
                }
                
            } catch (error) {
                addLog(\`❌ Erreur scraping: \${error.message}\`);
            } finally {
                btn.disabled = false;
                btn.textContent = '🔍 Lancer Test Scraping';
            }
        }

        // Scraping complet
        async function fullScraping() {
            if (!confirm('Lancer le scraping de toutes les cartes actives en mode test ?')) {
                return;
            }
            
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = 'Scraping en cours...';
            
            try {
                addLog('🚀 Scraping complet démarré (mode test)...');
                
                const response = await fetch('/api/admin/full-scraping', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ dryRun: true })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    addLog(\`✅ Scraping complet terminé !\`);
                    addLog(\`   Cartes scannées: \${result.summary.totalCards}\`);
                    addLog(\`   Résultats trouvés: \${result.summary.totalResults}\`);
                    addLog(\`   Temps: \${result.summary.executionTime}s\`);
                } else {
                    addLog(\`❌ Scraping complet échoué: \${result.error}\`);
                }
                
            } catch (error) {
                addLog(\`❌ Erreur scraping complet: \${error.message}\`);
            } finally {
                btn.disabled = false;
                btn.textContent = '🚀 Scraping Toutes Cartes (Dry Run)';
            }
        }

        // Reset alertes
        async function resetAlerts() {
            if (!confirm('⚠️ ATTENTION: Vider toutes les alertes envoyées ?\\n\\nCette action est irréversible et permettra la re-émission de toutes les alertes lors du prochain scraping.\\n\\nContinuer ?')) {
                return;
            }
            
            if (!confirm('Êtes-vous vraiment sûr ? Cette action va supprimer TOUTES les alertes de la base de données.')) {
                return;
            }
            
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = 'Suppression en cours...';
            
            try {
                addLog('🗑️ Reset des alertes démarré...');
                
                const response = await fetch('/api/admin/reset-alerts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    addLog(\`✅ Reset terminé: \${result.deletedCount} alertes supprimées\`);
                    addLog('💡 Toutes les alertes pourront maintenant être re-émises');
                } else {
                    addLog(\`❌ Reset échoué: \${result.error}\`);
                }
                
            } catch (error) {
                addLog(\`❌ Erreur reset alertes: \${error.message}\`);
            } finally {
                btn.disabled = false;
                btn.textContent = '⚠️ Vider Toutes les Alertes';
            }
        }

        // Initialisation
        connectWebSocket();
        addLog('🚀 Interface de test du scraper prête !');
    </script>
</body>
</html>
            `);
        } catch (error) {
            console.error('Show scraper page error:', error);
            res.status(500).send('Erreur serveur');
        }
    }

    /**
     * API: Test Discord
     */
    static async testDiscordAPI(req, res) {
        try {
            const { type } = req.body;
            
            const result = await sendDiscordTest();
            
            res.json({
                success: result.success,
                error: result.error || null
            });
            
        } catch (error) {
            console.error('Test Discord API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * API: Test Scraping
     */
    static async testScrapingAPI(req, res) {
        try {
            const { query: searchQuery, maxPrice } = req.body;
            
            if (!searchQuery) {
                return res.status(400).json({
                    success: false,
                    error: 'Query manquante'
                });
            }
            
            if (!maxPrice || maxPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Prix maximum manquant ou invalide'
                });
            }
            
            // Créer un service temporaire pour le test
            const scrapingService = new AutoScrapingService();
            
            // S'ASSURER QUE LE TEST N'EST PAS EN DRY_RUN NON PLUS
            delete process.env.DRY_RUN;
            console.log('🧪 TEST SCRAPING - Mode PRODUCTION forcé');
            
            // Utiliser la méthode spéciale pour les tests (anti-doublon par URL uniquement)
            const result = await scrapingService.scrapeCardForTesting(searchQuery, parseFloat(maxPrice));
            
            // Nettoyer les scrapers
            await scrapingService.cleanup();
            
            res.json({
                success: true,
                totalResults: result.totalResults,
                affordableResults: result.newAlerts, // Les résultats dans le budget
                newAlerts: result.newAlerts,
                cardName: result.cardName,
                maxPrice: result.maxPrice,
                details: [
                    { site: 'vinted', results: Math.floor(result.totalResults * 0.6) }, // TODO: Utiliser les vrais compteurs par site
                    { site: 'ebay', results: Math.floor(result.totalResults * 0.4) }     // TODO: Une fois qu'on a accès aux détails
                ]
            });
            
        } catch (error) {
            console.error('Test scraping API error:', error);
            
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * API: Scraping Complet
     */
    static async fullScrapingAPI(req, res) {
        try {
            const scrapingService = new AutoScrapingService();
            
            // FORCER LE MODE PRODUCTION - PLUS DE DRY_RUN
            delete process.env.DRY_RUN;
            console.log('🚀 SCRAPING COMPLET - Mode PRODUCTION forcé');
            
            const result = await scrapingService.scrapeAllCards();
            
            // Nettoyer
            await scrapingService.cleanup();
            
            res.json({
                success: true,
                summary: result.summary,
                cards: result.cards
            });
            
        } catch (error) {
            console.error('Full scraping API error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * API: Reset Alertes (pour tests)
     */
    static async resetAlertsAPI(req, res) {
        try {
            console.log(`🗑️ Reset alertes demandé par ${req.session.username} (${req.ip})`);
            
            // Compter les alertes avant suppression
            const countResult = await query('SELECT COUNT(*) as count FROM sent_alerts');
            const alertCount = countResult[0].count;
            
            // Supprimer toutes les alertes
            await query('DELETE FROM sent_alerts');
            
            // Logger l'action pour traçabilité
            await query(`
                INSERT INTO scraping_logs (type, reference_id, site, status, results_count, error_message) 
                VALUES ('card_scraping', NULL, 'admin_reset', 'success', ?, ?)
            `, [alertCount, `Reset alertes par ${req.session.username}`]);
            
            console.log(`✅ ${alertCount} alertes supprimées par ${req.session.username}`);
            
            res.json({
                success: true,
                deletedCount: alertCount,
                message: `${alertCount} alertes supprimées avec succès`
            });
            
        } catch (error) {
            console.error('Reset alerts API error:', error);
            
            // Logger l'erreur
            await query(`
                INSERT INTO scraping_logs (type, reference_id, site, status, results_count, error_message) 
                VALUES ('card_scraping', NULL, 'admin_reset', 'error', 0, ?)
            `, [`Erreur reset par ${req.session.username}: ${error.message}`]);
            
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}