#!/usr/bin/env node

/**
 * Script d'initialisation de la base de données Bot Remi
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
};

async function setupDatabase() {
    let connection = null;
    
    try {
        console.log('🔗 Connexion à MariaDB/MySQL...');
        connection = await mysql.createConnection(dbConfig);
        
        console.log('📄 Lecture du script d\'initialisation...');
        const sqlScript = fs.readFileSync(
            path.join(__dirname, '../database/init.sql'), 
            'utf8'
        );
        
        console.log('🗄️ Exécution du script d\'initialisation...');
        await connection.query(sqlScript);
        
        console.log('🔐 Génération du hash pour le mot de passe admin...');
        const adminPassword = process.env.ADMIN_PASSWORD || 'BotRemi2025!SecureAdm1n$';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        console.log('👤 Mise à jour du mot de passe admin...');
        await connection.query(
            'USE remi_bot; UPDATE users SET password_hash = ? WHERE username = "admin"',
            [hashedPassword]
        );
        
        console.log('✅ Base de données initialisée avec succès !');
        console.log('');
        console.log('📋 Informations de connexion :');
        console.log(`   Utilisateur: admin`);
        console.log(`   Mot de passe: ${adminPassword}`);
        console.log('');
        console.log('🎯 Cartes d\'exemple créées :');
        console.log('   - Magneton SVP 159 (max: 15€)');
        console.log('   - Artikodin 161/159 (max: 30€)');
        console.log('   - Dracaufeu ex 199/165 (max: 250€)');
        console.log('');
        console.log('📅 Surveillance stock configurée :');
        console.log('   - Pokemon Coffret Premium (26/09/2025)');
        console.log('');
        console.log('🚀 Vous pouvez maintenant démarrer le serveur !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation :', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('');
            console.log('💡 Solutions possibles :');
            console.log('   1. Vérifiez les identifiants MySQL dans le .env');
            console.log('   2. Créez l\'utilisateur avec ces commandes :');
            console.log('');
            console.log('   sudo mysql -u root -p');
            console.log('   CREATE USER \'botremi\'@\'localhost\' IDENTIFIED BY \'BotRemi2025!DbSecure#Pass\';');
            console.log('   GRANT ALL PRIVILEGES ON *.* TO \'botremi\'@\'localhost\';');
            console.log('   FLUSH PRIVILEGES;');
            console.log('   EXIT;');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Exécuter le script
setupDatabase();