-- =====================================================
-- BOT REMI - SCRIPT DE PRODUCTION FINAL
-- Système simple et fonctionnel pour scraping Pokemon
-- =====================================================

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS remi_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE remi_bot;

-- =====================================================
-- TABLE 1: AUTHENTIFICATION ADMIN
-- =====================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE 2: CARTES À SURVEILLER (CŒUR DU SYSTÈME)
-- =====================================================
CREATE TABLE card_references (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'Nom de la carte (ex: Dracaufeu ex)',
    reference VARCHAR(255) NOT NULL COMMENT 'Référence exacte (ex: 199/165)',
    max_price DECIMAL(10,2) NOT NULL COMMENT 'Prix maximum pour alerte',
    active BOOLEAN DEFAULT TRUE COMMENT 'Activer/désactiver la surveillance',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (active),
    INDEX idx_reference (reference)
);

-- =====================================================
-- TABLE 3: ANTI-DOUBLON SIMPLE (UNE URL = UNE ALERTE)
-- =====================================================
CREATE TABLE sent_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_reference_id INT NULL COMMENT 'ID carte (optionnel, pour stats)',
    site VARCHAR(50) NOT NULL COMMENT 'vinted, ebay, etc.',
    product_link TEXT NOT NULL COMMENT 'URL du produit',
    title VARCHAR(512) NOT NULL COMMENT 'Titre du produit',
    price DECIMAL(10,2) NOT NULL COMMENT 'Prix trouvé',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- INDEX UNIQUE SUR L'URL UNIQUEMENT (anti-doublon simple)
    UNIQUE KEY unique_url (product_link(500)),
    
    -- INDEX pour performance
    INDEX idx_site (site),
    INDEX idx_sent_at (sent_at),
    INDEX idx_card_stats (card_reference_id) COMMENT 'Pour statistiques uniquement'
) COMMENT 'Une URL = une seule alerte, système simple et efficace';

-- =====================================================
-- TABLE 4: LOGS DE SCRAPING (DEBUGGING)
-- =====================================================
CREATE TABLE scraping_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('card_scraping') NOT NULL DEFAULT 'card_scraping',
    reference_id INT NULL COMMENT 'ID de la carte surveillée',
    site VARCHAR(50) NULL,
    status ENUM('success', 'error', 'no_results') NOT NULL,
    results_count INT DEFAULT 0,
    error_message TEXT NULL,
    execution_time INT NULL COMMENT 'Temps d\'exécution en millisecondes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_status (type, status),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- TABLE 5: SÉCURITÉ CONNEXIONS
-- =====================================================
CREATE TABLE login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45) NULL COMMENT 'IPv4 ou IPv6',
    user_agent TEXT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_attempted_at (attempted_at),
    INDEX idx_success (success)
) COMMENT 'Log des tentatives de connexion pour sécurité';

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Utilisateur admin par défaut
-- Mot de passe: AdminBot2025!
INSERT INTO users (username, password_hash) VALUES 
('admin', '$2b$12$nqSoqbSj16mn1sah4araue6BwfvpIlbe5RLhrXanZA1ZARB3tDiJu');

-- Cartes d'exemple pour les tests
INSERT INTO card_references (name, reference, max_price) VALUES 
('Magneton SVP', '159', 15.00),
('Artikodin', '161/159', 30.00),
('Dracaufeu ex', '199/165', 250.00);

-- =====================================================
-- UTILISATEUR MYSQL RECOMMANDÉ
-- =====================================================

/*
CREATE USER 'botremi'@'localhost' IDENTIFIED BY 'BotRemi2025!DbSecure#Pass';
GRANT ALL PRIVILEGES ON remi_bot.* TO 'botremi'@'localhost';
FLUSH PRIVILEGES;
*/

-- =====================================================
-- VÉRIFICATIONS FINALES
-- =====================================================
SHOW TABLES;
SELECT 'Installation terminée - Bot Remi prêt pour la production (cartes Pokemon) !' as STATUS;