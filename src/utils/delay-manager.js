/**
 * Gestionnaire intelligent des délais pour éviter la détection anti-bot
 * Simule un comportement humain avec des pauses variables
 */
export class DelayManager {
    constructor(options = {}) {
        // Configuration des délais par défaut (en millisecondes)
        this.config = {
            // Délais entre sites (par carte)
            intersiteDelay: {
                vinted: { base: 2000, variance: 3000 },    // 2-5s après Vinted
                ebay: { base: 2500, variance: 2000 },      // 2.5-4.5s après eBay
                cardmarket: { base: 4000, variance: 2000 } // 4-6s après CardMarket (plus prudent)
            },
            
            // Délai entre cartes (simulation réflexion humaine)
            intercardDelay: {
                base: 5000,   // 5s minimum
                variance: 5000 // +0-5s aléatoire = 5-10s total
            },
            
            // Délai minimum de sécurité entre toute requête
            minimumDelay: 1000,
            
            // Mode test : délais réduits pour les tests rapides
            testMode: options.testMode || false,
            testDivider: 10 // Diviser les délais par 10 en mode test
        };
    }

    /**
     * Calcule un délai aléatoire dans une plage donnée
     * @param {number} base - Délai de base en ms
     * @param {number} variance - Variance aléatoire en ms
     * @returns {number} Délai calculé en ms
     */
    calculateDelay(base, variance) {
        const delay = base + Math.random() * variance;
        const finalDelay = this.config.testMode ? delay / this.config.testDivider : delay;
        return Math.max(finalDelay, this.config.minimumDelay);
    }

    /**
     * Attend avec un délai entre sites après scraping
     * @param {string} siteName - Nom du site qui vient d'être scrapé
     * @returns {Promise<void>}
     */
    async waitAfterSite(siteName) {
        const siteConfig = this.config.intersiteDelay[siteName.toLowerCase()];
        
        if (!siteConfig) {
            console.log(`⚠️ Délai non configuré pour ${siteName}, utilisation délai par défaut`);
            const delay = this.calculateDelay(2000, 2000); // 2-4s par défaut
            console.log(`⏳ Délai inter-site (défaut): ${Math.round(delay)}ms`);
            await this.sleep(delay);
            return;
        }

        const delay = this.calculateDelay(siteConfig.base, siteConfig.variance);
        console.log(`⏳ Délai après ${siteName}: ${Math.round(delay)}ms`);
        await this.sleep(delay);
    }

    /**
     * Attend avec un délai entre cartes
     * @param {string} currentCard - Nom de la carte qui vient d'être traitée
     * @param {string} nextCard - Nom de la carte suivante (optionnel)
     * @returns {Promise<void>}
     */
    async waitBetweenCards(currentCard = '', nextCard = '') {
        const delay = this.calculateDelay(
            this.config.intercardDelay.base, 
            this.config.intercardDelay.variance
        );
        
        const logMessage = nextCard 
            ? `⏳ Pause entre "${currentCard}" et "${nextCard}": ${Math.round(delay)}ms`
            : `⏳ Pause après "${currentCard}": ${Math.round(delay)}ms`;
            
        console.log(logMessage);
        await this.sleep(delay);
    }

    /**
     * Attend avec le délai minimum de sécurité
     * @returns {Promise<void>}
     */
    async waitMinimum() {
        const delay = this.config.testMode 
            ? this.config.minimumDelay / this.config.testDivider 
            : this.config.minimumDelay;
        
        console.log(`⏳ Délai minimum: ${Math.round(delay)}ms`);
        await this.sleep(delay);
    }

    /**
     * Simule un délai de "réflexion" humaine
     * @param {number} multiplier - Multiplicateur du délai (défaut: 1)
     * @returns {Promise<void>}
     */
    async waitHumanThinking(multiplier = 1) {
        const baseThinking = 1500; // 1.5s de base
        const variance = 2000;     // +0-2s
        const delay = this.calculateDelay(baseThinking, variance) * multiplier;
        
        console.log(`🤔 Simulation réflexion humaine: ${Math.round(delay)}ms`);
        await this.sleep(delay);
    }

    /**
     * Fonction de pause générique
     * @param {number} ms - Délai en millisecondes
     * @returns {Promise<void>}
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, Math.round(ms)));
    }

    /**
     * Active le mode test (délais réduits)
     */
    enableTestMode() {
        this.config.testMode = true;
        console.log(`🧪 Mode test activé - délais divisés par ${this.config.testDivider}`);
    }

    /**
     * Désactive le mode test (délais normaux)
     */
    disableTestMode() {
        this.config.testMode = false;
        console.log(`🔄 Mode normal activé - délais complets`);
    }

    /**
     * Retourne la configuration actuelle des délais
     * @returns {Object} Configuration des délais
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Estime le temps total pour scraper plusieurs cartes
     * @param {number} cardCount - Nombre de cartes
     * @param {number} siteCount - Nombre de sites par carte
     * @returns {Object} Estimation temporelle
     */
    estimateScrapingTime(cardCount, siteCount) {
        // Estimation grossière : temps scraping + délais
        const avgScrapingPerSite = this.config.testMode ? 3000 : 15000; // 3s en test, 15s en prod
        const avgIntersiteDelay = this.calculateDelay(2500, 2000);
        const avgIntercardDelay = this.calculateDelay(
            this.config.intercardDelay.base, 
            this.config.intercardDelay.variance
        );

        const totalScrapingTime = cardCount * siteCount * avgScrapingPerSite;
        const totalIntersiteDelays = cardCount * (siteCount - 1) * avgIntersiteDelay;
        const totalIntercardDelays = (cardCount - 1) * avgIntercardDelay;
        
        const totalTimeMs = totalScrapingTime + totalIntersiteDelays + totalIntercardDelays;
        const totalTimeSeconds = Math.round(totalTimeMs / 1000);
        const totalTimeMinutes = Math.round(totalTimeSeconds / 60);

        return {
            totalTimeMs,
            totalTimeSeconds,
            totalTimeMinutes,
            breakdown: {
                scraping: Math.round(totalScrapingTime / 1000),
                intersiteDelays: Math.round(totalIntersiteDelays / 1000),
                intercardDelays: Math.round(totalIntercardDelays / 1000)
            }
        };
    }
}