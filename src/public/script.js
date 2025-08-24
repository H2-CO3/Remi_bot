class BotRemiUI {
    constructor() {
        this.ws = null;
        this.initWebSocket();
        this.bindEvents();
        this.checkDatabaseStatus();
        // Vérifier la BDD toutes les 30 secondes
        setInterval(() => this.checkDatabaseStatus(), 30000);
    }

    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus(true);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateConnectionStatus(false);
            // Tentative de reconnexion après 3 secondes
            setTimeout(() => this.initWebSocket(), 3000);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span');
        
        if (connected) {
            dot.classList.remove('offline');
            dot.classList.add('online');
            text.textContent = 'WebSocket';
        } else {
            dot.classList.remove('online');
            dot.classList.add('offline');
            text.textContent = 'WebSocket';
        }
    }

    async checkDatabaseStatus() {
        try {
            const response = await fetch('/api/database-status');
            const data = await response.json();
            this.updateDatabaseStatus(data);
        } catch (error) {
            console.error('Error checking database status:', error);
            this.updateDatabaseStatus({
                success: false,
                status: 'error',
                error: 'Network error'
            });
        }
    }

    updateDatabaseStatus(data) {
        const statusElement = document.getElementById('databaseStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span');
        
        // Reset classes
        dot.classList.remove('online', 'offline', 'unknown');
        
        if (data.success) {
            dot.classList.add('online');
            text.textContent = `Base (${data.data.users} users, ${data.data.activeCards} cartes)`;
            statusElement.title = `Connecté à ${data.database} sur ${data.host}`;
            
            if (data.tables.missing.length > 0) {
                dot.classList.remove('online');
                dot.classList.add('unknown');
                text.textContent = `Base (${data.tables.missing.length} tables manquantes)`;
                statusElement.title = `Tables manquantes: ${data.tables.missing.join(', ')}`;
            }
        } else {
            dot.classList.add('offline');
            text.textContent = 'Base (erreur)';
            statusElement.title = `Erreur: ${data.error}`;
        }
    }

    bindEvents() {
        // Test Discord
        document.getElementById('testDiscordBtn').addEventListener('click', () => {
            this.testDiscord();
        });

        // Form de recherche
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startSearch();
        });

        // Gestion des onglets de résultats
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tab-button')) {
                const tabButton = e.target.closest('.tab-button');
                this.switchTab(tabButton.dataset.site);
            }
        });
    }

    async testDiscord() {
        const btn = document.getElementById('testDiscordBtn');
        const resultDiv = document.getElementById('discordTestResult');
        
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Test en cours...';
        
        try {
            const response = await fetch('/api/test-discord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(resultDiv, 'success', '✅ Test Discord réussi !');
            } else {
                this.showMessage(resultDiv, 'error', `❌ ${data.message}`);
            }
        } catch (error) {
            this.showMessage(resultDiv, 'error', `❌ Erreur: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="btn-icon">💬</span> Tester Discord';
        }
    }

    async startSearch() {
        const form = document.getElementById('searchForm');
        const formData = new FormData(form);
        const cardReference = formData.get('cardReference');
        const maxPrice = parseFloat(formData.get('maxPrice'));
        
        if (!cardReference || !maxPrice) {
            alert('Veuillez remplir tous les champs');
            return;
        }

        // Reset UI
        this.resetSearchUI();
        this.showSection('progressSection');
        this.hideSection('resultsSection');
        this.hideSection('errorsSection');

        // Disable form
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Recherche en cours...';

        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cardReference,
                    maxPrice
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                this.showError(data.message);
            }
        } catch (error) {
            this.showError(`Erreur de connexion: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-icon">🚀</span> Lancer la recherche';
        }
    }

    handleWebSocketMessage(message) {
        console.log('WebSocket message:', message);
        
        switch (message.type) {
            case 'discord-test-start':
                this.showMessage(document.getElementById('discordTestResult'), 'info', message.message);
                break;
                
            case 'discord-test-success':
                this.showMessage(document.getElementById('discordTestResult'), 'success', message.message);
                break;
                
            case 'discord-test-error':
                this.showMessage(document.getElementById('discordTestResult'), 'error', message.message);
                break;
                
            case 'scrape-start':
                this.updateProgress('all', 'loading', message.message);
                break;
                
            case 'scrape-site-start':
                this.updateProgress(message.site, 'loading', `🔍 Scraping en cours...`);
                break;
                
            case 'scrape-site-success':
                this.updateProgress(message.site, 'success', `✅ ${message.results || 0} résultats`);
                break;
                
            case 'scrape-site-error':
                this.updateProgress(message.site, 'error', `❌ Erreur`);
                this.addError(message.site, message.message);
                break;
                
            case 'scrape-complete':
                this.showResults(message.results, message.summary, message.allResults);
                break;
                
            case 'scrape-error':
                this.showError(message.message);
                break;
        }
    }

    showMessage(element, type, message) {
        element.className = `result-message ${type}`;
        element.textContent = message;
        element.style.display = 'block';
        
        // Auto-hide après 5 secondes pour les messages de succès
        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    showSection(sectionId) {
        document.getElementById(sectionId).style.display = 'block';
        document.getElementById(sectionId).classList.add('fade-in');
    }

    hideSection(sectionId) {
        document.getElementById(sectionId).style.display = 'none';
    }

    resetSearchUI() {
        // Reset progress
        const progressItems = document.querySelectorAll('.progress-item');
        progressItems.forEach(item => {
            item.className = 'progress-item';
            item.querySelector('.progress-status').textContent = 'En attente...';
        });

        // Clear results
        document.getElementById('resultsContainer').innerHTML = '';
        document.getElementById('errorsContainer').innerHTML = '';
    }

    updateProgress(site, status, message) {
        if (site === 'all') {
            const progressItems = document.querySelectorAll('.progress-item');
            progressItems.forEach(item => {
                if (status === 'loading') {
                    item.classList.add('loading');
                }
                item.querySelector('.progress-status').textContent = message;
            });
        } else {
            const progressItem = document.querySelector(`[data-site="${site}"]`);
            if (progressItem) {
                progressItem.className = `progress-item ${status}`;
                progressItem.querySelector('.progress-status').textContent = message;
            }
        }
    }

    showResults(results, summary) {
        const container = document.getElementById('resultsContainer');
        const summaryEl = document.getElementById('resultsSummary');
        
        // Store results for filtering
        this.allResults = results;
        
        // On ne compte que les résultats de recherche affichés
        const resultsForCounting = results;
        
        // Count results by site (Vinted et eBay actifs)
        const countsBySite = {
            all: resultsForCounting.length,
            vinted: resultsForCounting.filter(r => r.site.toLowerCase() === 'vinted').length,
            ebay: resultsForCounting.filter(r => r.site.toLowerCase() === 'ebay').length
        };
        
        // Update tab counts
        this.updateTabCounts(countsBySite);
        
        // Update summary (uniquement les résultats de recherche)
        summaryEl.innerHTML = `
            <div class="summary-stat">
                <span>🎯</span>
                <span>${summary.resultsFound || results.length} résultats trouvés</span>
            </div>
        `;

        // Show results
        if (results.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>😔 Aucun résultat trouvé</h3>
                    <p>Essayez d'augmenter le prix maximum ou de modifier la référence de la carte.</p>
                </div>
            `;
        } else {
            container.innerHTML = results.map(result => this.createResultCard(result)).join('');
        }

        // Reset to "all" tab
        this.switchTab('all');
        this.showSection('resultsSection');
    }

    createResultCard(result) {
        const siteIcon = this.getSiteIcon(result.site);
        const imageHtml = result.image ? 
            `<div class="result-image">
                <img src="${result.image}" alt="${this.escapeHtml(result.title)}" loading="lazy" onerror="this.style.display='none'">
            </div>` : '';
            
        return `
            <div class="result-card fade-in" data-site="${result.site.toLowerCase()}">
                ${imageHtml}
                <div class="result-content">
                    <div class="result-header">
                        <h3 class="result-title">${this.escapeHtml(result.title)}</h3>
                        <div class="result-meta">
                            <span class="result-site">
                                <span class="site-icon">${siteIcon}</span>
                                ${result.site}
                            </span>
                            <span class="result-price">${result.priceText}</span>
                        </div>
                    </div>
                    <div class="result-actions">
                        <a href="${result.link}" target="_blank" class="result-link">
                            <span>🔗</span>
                            Voir l'annonce
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    getSiteIcon(site) {
        const icons = {
            'vinted': '👕',
            'ebay': '🛒',
            'cardmarket': '🎴'
        };
        return icons[site.toLowerCase()] || '📦';
    }

    addError(site, message) {
        const container = document.getElementById('errorsContainer');
        const errorEl = document.createElement('div');
        errorEl.className = 'error-item fade-in';
        errorEl.innerHTML = `
            <strong>${site}:</strong> ${this.escapeHtml(message)}
        `;
        container.appendChild(errorEl);
        this.showSection('errorsSection');
    }

    showError(message) {
        this.addError('Système', message);
    }

    updateTabCounts(counts) {
        Object.entries(counts).forEach(([site, count]) => {
            const tabButton = document.querySelector(`[data-site="${site}"]`);
            if (tabButton) {
                const countSpan = tabButton.querySelector('.tab-count');
                if (countSpan) {
                    countSpan.textContent = `(${count})`;
                }
            }
        });
    }

    switchTab(targetSite) {
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-site="${targetSite}"]`).classList.add('active');

        // Filter results
        const resultCards = document.querySelectorAll('.result-card[data-site]');
        resultCards.forEach(card => {
            if (targetSite === 'all' || card.dataset.site === targetSite) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BotRemiUI();
});