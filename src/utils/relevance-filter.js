/**
 * Filtre de pertinence strict pour les résultats de scraping
 * Assure une correspondance exacte avec le terme recherché
 */

export class RelevanceFilter {
  
  /**
   * Filtre les résultats pour ne garder que ceux qui correspondent exactement
   * @param {Array} results - Les résultats à filtrer
   * @param {string} searchTerm - Le terme recherché
   * @param {Object} options - Options de filtrage
   * @returns {Array} Résultats filtrés
   */
  static filterResults(results, searchTerm, options = {}) {
    if (!searchTerm || !results.length) return results;
    
    const {
      strictMode = true,           // Mode strict: tous les mots requis
      caseSensitive = false,       // Sensible à la casse
      includePartialNumbers = true // Inclure les correspondances partielles de numéros
    } = options;
    
    console.log(`🔍 Filtrage de pertinence: "${searchTerm}" (${strictMode ? 'strict' : 'souple'})`);
    
    // Nettoyer et parser le terme de recherche
    const searchWords = this.parseSearchTerm(searchTerm, caseSensitive);
    console.log(`📝 Mots-clés extraits: ${searchWords.join(', ')}`);
    
    const filteredResults = results.filter(result => {
      const isRelevant = this.isResultRelevant(result, searchWords, {
        strictMode,
        caseSensitive,
        includePartialNumbers
      });
      
      if (isRelevant) {
        console.log(`✅ Gardé: "${result.title}"`);
      } else {
        console.log(`❌ Rejeté: "${result.title}"`);
      }
      
      return isRelevant;
    });
    
    console.log(`📊 Filtrage: ${results.length} → ${filteredResults.length} résultats`);
    return filteredResults;
  }
  
  /**
   * Parse le terme de recherche en mots-clés et numéros
   */
  static parseSearchTerm(searchTerm, caseSensitive = false) {
    const normalized = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    // Séparer les mots et garder les numéros/références
    const words = normalized
      .split(/[\s\-_]+/)
      .filter(word => word.length > 0)
      .map(word => word.trim());
    
    return words;
  }
  
  /**
   * Vérifie si un résultat est pertinent
   */
  static isResultRelevant(result, searchWords, options) {
    const { strictMode, caseSensitive, includePartialNumbers } = options;
    
    // Textes à analyser (titre prioritaire, puis URL si disponible)
    const textSources = [
      { text: result.title || '', weight: 3 },
      { text: result.link || '', weight: 1 }
    ];
    
    // Normaliser les textes
    const normalizedTexts = textSources.map(source => ({
      text: caseSensitive ? source.text : source.text.toLowerCase(),
      weight: source.weight
    }));
    
    let matchedWords = new Set();
    let totalScore = 0;
    
    // Vérifier chaque mot-clé
    for (const word of searchWords) {
      let wordFound = false;
      
      for (const { text, weight } of normalizedTexts) {
        if (this.wordMatches(text, word, includePartialNumbers)) {
          matchedWords.add(word);
          totalScore += weight;
          wordFound = true;
          break; // Mot trouvé, passer au suivant
        }
      }
      
      // En mode strict, TOUS les mots doivent être trouvés
      if (strictMode && !wordFound) {
        return false;
      }
    }
    
    // En mode strict : tous les mots requis
    if (strictMode) {
      return matchedWords.size === searchWords.length;
    }
    
    // En mode souple : au moins 75% des mots requis
    const matchRatio = matchedWords.size / searchWords.length;
    return matchRatio >= 0.75;
  }
  
  /**
   * Vérifie si un mot correspond dans un texte
   */
  static wordMatches(text, word, includePartialNumbers = true) {
    // Pour les mots courts (2-3 lettres), exiger une correspondance plus stricte
    if (word.length <= 3) {
      // Utiliser des regex avec limites de mots pour éviter les faux positifs
      const wordRegex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
      if (wordRegex.test(text)) {
        return true;
      }
    } else {
      // Pour les mots plus longs, correspondance directe est OK
      if (text.includes(word)) {
        return true;
      }
    }
    
    // Correspondance partielle pour les numéros (ex: "074" match "74")
    if (includePartialNumbers && this.isNumeric(word)) {
      const cleanWord = word.replace(/^0+/, ''); // Supprimer zéros en début
      if (text.includes(cleanWord) && cleanWord.length >= 2) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Échappe les caractères spéciaux pour regex
   */
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Vérifie si une chaîne est numérique
   */
  static isNumeric(str) {
    return /^\d+$/.test(str);
  }
}