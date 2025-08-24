/**
 * Simple logger utility pour contrôler les logs selon l'environnement
 * Optimisé pour Raspberry Pi - logs minimaux en production
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// En production, seuls les erreurs et warnings sont affichés
// En développement, tout est affiché
const shouldLog = (level) => {
    if (isProduction) {
        return level === 'error' || level === 'warn';
    }
    if (isTest) {
        return false; // Pas de logs en test
    }
    return true; // Développement : tous les logs
};

export const logger = {
    info: (...args) => {
        if (shouldLog('info')) {
            console.log(...args);
        }
    },
    
    warn: (...args) => {
        if (shouldLog('warn')) {
            console.warn(...args);
        }
    },
    
    error: (...args) => {
        if (shouldLog('error')) {
            console.error(...args);
        }
    },
    
    debug: (...args) => {
        if (shouldLog('debug')) {
            console.log('[DEBUG]', ...args);
        }
    }
};

// Pour compatibilité, exporter aussi les méthodes individuelles
export const { info, warn, error, debug } = logger;