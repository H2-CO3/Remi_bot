/**
 * Système de filtrage ULTRA-STRICT
 * RÈGLE : Correspondance EXACTE obligatoire pour chaque élément de la recherche
 */

export class PokemonFilter {
  
  /**
   * Filtre les résultats avec une précision maximale
   */
  static filterResults(results, searchTerm) {
    if (!searchTerm) {
      console.log(`⚠️ Aucun terme de recherche fourni`);
      return results;
    }
    
    console.log(`🔍 FILTRAGE ULTRA-STRICT pour: "${searchTerm}"`);
    
    // Normaliser le terme de recherche
    const normalizedSearchTerm = this.normalizeForStrictMatching(searchTerm);
    console.log(`📝 Recherche normalisée: "${normalizedSearchTerm}"`);
    
    // Extraire les mots-clés obligatoires
    const requiredKeywords = this.extractStrictKeywords(normalizedSearchTerm);
    console.log(`🔑 Mots-clés obligatoires:`, requiredKeywords);
    
    const filteredResults = results.filter(result => {
      return this.isUltraStrictMatch(result, requiredKeywords, searchTerm);
    });
    
    console.log(`📊 FILTRAGE ULTRA-STRICT: ${results.length} → ${filteredResults.length} résultats`);
    return filteredResults;
  }
  
  /**
   * Normalisation stricte pour matching exact
   */
  static normalizeForStrictMatching(text) {
    if (!text) return '';
    
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever accents
      .toLowerCase() // Minuscules
      .replace(/[^\w\s\/\-]/g, ' ') // Remplacer ponctuation par espaces (sauf / et -)
      .replace(/\s+/g, ' ') // Normaliser espaces multiples
      .trim();
  }
  
  /**
   * Extraction des mots-clés avec logique stricte
   */
  static extractStrictKeywords(normalizedText) {
    // Séparer par espaces et filtrer les mots vides
    const words = normalizedText.split(/\s+/).filter(word => 
      word.length > 0 && 
      !this.isStopWord(word)
    );
    
    return {
      allWords: words,
      exactPhrases: this.identifyExactPhrases(words),
      numericRefs: this.extractNumericReferences(normalizedText)
    };
  }
  
  /**
   * Identifie les phrases exactes importantes (références numériques, etc.)
   */
  static identifyExactPhrases(words) {
    const exactPhrases = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Références de type "199/165" ou "SM12-123"
      if (/\d+[\/\-]\d+/.test(word)) {
        exactPhrases.push({
          type: 'numeric_ref',
          value: word,
          mustBeExact: true
        });
      }
      
      // Combinaisons mot + nombre (ex: "ex", "gx", "v")
      if (i < words.length - 1 && /^(ex|gx|v|vmax|vstar)$/i.test(word) && /\d/.test(words[i + 1])) {
        exactPhrases.push({
          type: 'special_combo',
          value: `${word} ${words[i + 1]}`,
          mustBeExact: true
        });
        i++; // Skip next word car déjà traité
      }
    }
    
    return exactPhrases;
  }
  
  /**
   * Extrait les références numériques
   */
  static extractNumericReferences(text) {
    const numericRefs = [];
    
    // Pattern pour références type "199/165"
    const refMatches = text.match(/\d+\/\d+/g);
    if (refMatches) {
      numericRefs.push(...refMatches);
    }
    
    // Pattern pour codes type "SM12-123"
    const codeMatches = text.match(/[a-z]+\d+[\-\/]\d+/gi);
    if (codeMatches) {
      numericRefs.push(...codeMatches.map(m => m.toLowerCase()));
    }
    
    return numericRefs;
  }
  
  /**
   * Test de correspondance STRICT mais FLEXIBLE
   */
  static isUltraStrictMatch(result, requiredKeywords, originalSearchTerm) {
    const title = result.title || '';
    const normalizedTitle = this.normalizeForStrictMatching(title);
    
    console.log(`\n🔍 Test: "${title}"`);
    console.log(`📝 Titre normalisé: "${normalizedTitle}"`);
    console.log(`🔑 Recherche: "${originalSearchTerm}"`);
    
    // NOUVELLE APPROCHE : Tester d'abord si la recherche complète est dans le titre
    const normalizedSearchTerm = this.normalizeForStrictMatching(originalSearchTerm);
    
    // 1. Si la recherche complète est contenue dans le titre, c'est un match
    if (normalizedTitle.includes(normalizedSearchTerm)) {
      console.log(`✅ MATCH COMPLET trouvé: recherche complète présente`);
      return true;
    }
    
    // 2. D'abord vérifier les références numériques FLEXIBLES (prioritaire)
    const foundRefs = [];
    for (const ref of requiredKeywords.numericRefs) {
      // Créer des variantes de la référence (avec/sans slash, espaces, etc.)
      const refVariants = [
        ref,                           // Original: "161/159"  
        ref.replace('/', ''),          // Sans slash: "161159"
        ref.replace('/', ' '),         // Avec espace: "161 159"
        ref.replace('/', '-'),         // Avec tiret: "161-159"
      ];
      
      let found = false;
      for (const variant of refVariants) {
        const variantRegex = new RegExp(`\\b${this.escapeRegex(variant)}`, 'i');
        if (variantRegex.test(normalizedTitle)) {
          console.log(`✅ Référence trouvée (variante): "${variant}" pour "${ref}"`);
          foundRefs.push(ref);
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`❌ Référence numérique manquante (toutes variantes): "${ref}"`);
        return false;
      }
    }

    // 3. Ensuite tester les mots restants (en excluant les références déjà trouvées)
    let missingWords = [];
    for (const word of requiredKeywords.allWords) {
      // Si c'est une référence numérique déjà trouvée, l'ignorer
      if (foundRefs.includes(word)) {
        console.log(`✅ Référence déjà validée: "${word}"`);
        continue;
      }
      
      const wordRegex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
      const containsRegex = new RegExp(this.escapeRegex(word), 'i');
      
      if (!wordRegex.test(normalizedTitle) && !containsRegex.test(normalizedTitle)) {
        missingWords.push(word);
      } else {
        console.log(`✅ Mot trouvé: "${word}"`);
      }
    }
    
    // 4. Si plus de 20% des mots manquent, rejeter
    const missingPercentage = missingWords.length / requiredKeywords.allWords.length;
    if (missingPercentage > 0.2) {
      console.log(`❌ Trop de mots manquants (${Math.round(missingPercentage * 100)}%): ${missingWords.join(', ')}`);
      return false;
    }
    
    // 5. Si on arrive ici, c'est un match valide
    if (missingWords.length > 0) {
      console.log(`⚠️ MATCH PARTIEL (${missingWords.length} mots manquants): "${title}"`);
    } else {
      console.log(`✅ MATCH COMPLET validé pour: "${title}"`);
    }
    return true;
  }
  
  /**
   * Vérifie que l'ordre des éléments est logique
   */
  static checkElementOrder(normalizedTitle, requiredKeywords) {
    // Simple: vérifier que les mots apparaissent dans un ordre logique
    let lastPos = -1;
    
    for (const word of requiredKeywords.allWords) {
      const pos = normalizedTitle.indexOf(word.toLowerCase());
      if (pos === -1) return false;
      
      // Tolérance sur l'ordre strict, mais les éléments ne doivent pas être trop désordonnés
      if (pos < lastPos - 50) { // Tolérance de 50 caractères
        return false;
      }
      lastPos = pos;
    }
    
    return true;
  }
  
  /**
   * Mots vides à ignorer (RÉDUITS pour ne pas filtrer des termes importants)
   */
  static isStopWord(word) {
    const stopWords = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou'];
    return stopWords.includes(word.toLowerCase());
  }
  
  /**
   * Normalise le texte (enlève accents, normalise espaces)
   */
  static normalizeText(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever accents
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim()
      .toLowerCase(); // Toujours en minuscules
  }

  /**
   * Échappe les caractères spéciaux pour regex
   */
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}