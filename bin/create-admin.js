#!/usr/bin/env node

/**
 * Script pour créer/recréer l'utilisateur admin avec le bon hash
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
    console.log('👤 === CRÉATION UTILISATEUR ADMIN ===\n');

    let connection = null;

    try {
        // Connexion à la base
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'botremi',
            password: process.env.DB_PASSWORD || 'BotRemi2025!DbSecure#Pass',
            database: process.env.DB_NAME || 'remi_bot'
        });

        console.log('✅ Connexion à la base réussie');

        // Générer le hash du mot de passe
        const password = 'BotRemi2025!SecureAdm1n$';
        console.log('🔐 Génération du hash bcrypt...');
        const hashedPassword = await bcrypt.hash(password, 12);
        
        console.log('🗑️ Suppression ancien utilisateur admin...');
        await connection.execute('DELETE FROM users WHERE username = ?', ['admin']);

        console.log('➕ Création nouvel utilisateur admin...');
        await connection.execute(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            ['admin', hashedPassword, 'admin']
        );

        // Vérification
        const [users] = await connection.execute(
            'SELECT username, role, created_at FROM users WHERE username = ?',
            ['admin']
        );

        if (users.length > 0) {
            console.log('✅ Utilisateur admin créé avec succès !');
            console.log(`   Username: ${users[0].username}`);
            console.log(`   Role: ${users[0].role}`);
            console.log(`   Created: ${users[0].created_at}`);
        }

        console.log('\n🎉 === TERMINÉ ===');
        console.log('🌐 Vous pouvez maintenant vous connecter :');
        console.log('   URL: http://localhost:3000/admin/login');
        console.log('   Username: admin');
        console.log('   Password: BotRemi2025!SecureAdm1n$');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

createAdmin();