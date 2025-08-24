#!/usr/bin/env node

/**
 * Script de dépannage et correction de la base de données
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function fixDatabase() {
    console.log('🔧 === DÉPANNAGE BASE DE DONNÉES ===\n');

    let rootConnection = null;
    let userConnection = null;

    try {
        // 1. Connexion en tant que root
        console.log('🔗 Tentative de connexion root...');
        
        try {
            rootConnection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: '', // Pas de mot de passe par défaut sur MariaDB
                multipleStatements: true
            });
            console.log('✅ Connexion root réussie (sans mot de passe)');
        } catch (error) {
            console.log('❌ Connexion root échouée, essai avec sudo mysql requis');
            console.log('\n💡 Exécutez plutôt ces commandes manuellement :');
            console.log('sudo mariadb -u root');
            console.log('');
            printFixCommands();
            return;
        }

        // 2. Vérifier l'utilisateur existant
        console.log('\n🔍 Vérification utilisateur botremi...');
        const [users] = await rootConnection.execute(
            "SELECT User, Host FROM mysql.user WHERE User = 'botremi'"
        );
        
        if (users.length > 0) {
            console.log('✅ Utilisateur botremi trouvé');
            
            // Supprimer l'utilisateur existant
            console.log('🗑️ Suppression de l\'utilisateur existant...');
            await rootConnection.execute("DROP USER 'botremi'@'localhost'");
        } else {
            console.log('⚠️ Utilisateur botremi non trouvé');
        }

        // 3. Recréer l'utilisateur
        console.log('👤 Création du nouvel utilisateur botremi...');
        await rootConnection.execute(
            "CREATE USER 'botremi'@'localhost' IDENTIFIED BY 'BotRemi2025!DbSecure#Pass'"
        );

        // 4. Donner les permissions
        console.log('🔑 Attribution des permissions...');
        await rootConnection.execute(
            "GRANT ALL PRIVILEGES ON remi_bot.* TO 'botremi'@'localhost'"
        );

        // 5. Appliquer les changements
        console.log('🔄 Application des changements...');
        await rootConnection.execute("FLUSH PRIVILEGES");

        // 6. Tester la nouvelle connexion
        console.log('\n🧪 Test de la nouvelle connexion...');
        userConnection = await mysql.createConnection({
            host: 'localhost',
            user: 'botremi',
            password: 'BotRemi2025!DbSecure#Pass',
            database: 'remi_bot'
        });
        
        console.log('✅ Connexion utilisateur réussie !');

        // 7. Vérifier que l'admin existe
        console.log('👨‍💼 Vérification utilisateur admin...');
        const [adminUsers] = await userConnection.execute(
            'SELECT username FROM users WHERE username = "admin"'
        );

        if (adminUsers.length === 0) {
            console.log('➕ Création de l\'utilisateur admin...');
            const hashedPassword = await bcrypt.hash('BotRemi2025!SecureAdm1n$', 12);
            await userConnection.execute(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                ['admin', hashedPassword]
            );
        } else {
            console.log('✅ Utilisateur admin existe');
        }

        // 8. Vérifier/créer table login_attempts
        console.log('🔐 Vérification table login_attempts...');
        try {
            await userConnection.execute('SELECT 1 FROM login_attempts LIMIT 1');
            console.log('✅ Table login_attempts existe');
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('➕ Création table login_attempts...');
                await userConnection.execute(`
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
                    )
                `);
                console.log('✅ Table login_attempts créée');
            }
        }

        // 9. Vérifier les cartes d'exemple
        console.log('🎴 Vérification cartes d\'exemple...');
        const [cards] = await userConnection.execute(
            'SELECT COUNT(*) as count FROM card_references'
        );
        console.log(`✅ ${cards[0].count} cartes en base`);

        console.log('\n🎉 === RÉPARATION TERMINÉE ===');
        console.log('✅ Base de données opérationnelle');
        console.log('✅ Utilisateur botremi fonctionnel');
        console.log('✅ Utilisateur admin disponible');
        console.log('');
        console.log('🌐 Vous pouvez maintenant démarrer le serveur :');
        console.log('npm start');
        console.log('');
        console.log('🔗 Interface admin : http://localhost:3000/admin/login');
        console.log('👤 Identifiants : admin / BotRemi2025!SecureAdm1n$');

    } catch (error) {
        console.error('❌ Erreur lors de la réparation :', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Solution alternative :');
            printFixCommands();
        }
    } finally {
        if (rootConnection) await rootConnection.end();
        if (userConnection) await userConnection.end();
    }
}

function printFixCommands() {
    console.log('Exécutez ces commandes manuellement :');
    console.log('');
    console.log('sudo mariadb -u root');
    console.log('');
    console.log('Puis dans MariaDB :');
    console.log('');
    console.log("DROP USER IF EXISTS 'botremi'@'localhost';");
    console.log("CREATE USER 'botremi'@'localhost' IDENTIFIED BY 'BotRemi2025!DbSecure#Pass';");
    console.log("GRANT ALL PRIVILEGES ON remi_bot.* TO 'botremi'@'localhost';");
    console.log("FLUSH PRIVILEGES;");
    console.log("EXIT;");
    console.log('');
    console.log('Puis testez :');
    console.log('mysql -u botremi -p remi_bot');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node bin/fix-database.js

Ce script tente de réparer automatiquement les problèmes de connexion à la base de données :
- Recrée l'utilisateur botremi avec le bon mot de passe
- Vérifie les permissions
- S'assure que l'utilisateur admin existe
- Teste la connexion

Si le script échoue, il vous donnera les commandes à exécuter manuellement.
    `);
} else {
    fixDatabase();
}