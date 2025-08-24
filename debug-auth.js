import './src/env-loader.js';
import bcrypt from 'bcryptjs';
import { query } from './config/database.js';

async function debugAuth() {
    console.log('🔍 [DEBUG] Test de connexion base de données...');
    
    try {
        // Test connexion BDD
        const testQuery = await query('SELECT 1 as test');
        console.log('✅ [DEBUG] Connexion BDD OK');
        
        // Récupérer l'utilisateur admin
        console.log('🔍 [DEBUG] Recherche utilisateur admin...');
        const users = await query(
            'SELECT id, username, password_hash, role FROM users WHERE username = ? AND role = "admin"',
            ['admin']
        );
        
        console.log('🔍 [DEBUG] Utilisateurs trouvés:', users.length);
        
        if (users.length === 0) {
            console.log('❌ [DEBUG] Aucun utilisateur admin trouvé');
            return;
        }
        
        const user = users[0];
        console.log('🔍 [DEBUG] Utilisateur trouvé:', {
            id: user.id,
            username: user.username,
            role: user.role,
            hash_start: user.password_hash.substring(0, 30) + '...',
            hash_length: user.password_hash.length
        });
        
        // Test du mot de passe
        const password = 'AdminBot2025!';
        console.log('🔍 [DEBUG] Test password "AdminBot2025!" avec bcrypt...');
        
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log('🔍 [DEBUG] Résultat bcrypt.compare:', isValid);
        
        if (isValid) {
            console.log('✅ [DEBUG] Le mot de passe AdminBot2025! fonctionne !');
        } else {
            console.log('❌ [DEBUG] Le mot de passe AdminBot2025! ne fonctionne pas');
            
            // Générer un nouveau hash
            console.log('🔧 [DEBUG] Génération nouveau hash...');
            const newHash = await bcrypt.hash(password, 12);
            console.log('🔧 [DEBUG] Nouveau hash:', newHash);
            
            console.log('🔧 [DEBUG] Requête SQL pour corriger:');
            console.log(`UPDATE users SET password_hash = '${newHash}' WHERE username = 'admin';`);
        }
        
    } catch (error) {
        console.error('❌ [DEBUG] Erreur:', error);
        console.error('❌ [DEBUG] Stack:', error.stack);
    }
    
    process.exit(0);
}

debugAuth();