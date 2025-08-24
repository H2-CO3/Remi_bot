import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';

export class AuthService {
    
    /**
     * Vérifier les identifiants utilisateur
     */
    static async validateUser(username, password) {
        try {
            const users = await query(
                'SELECT id, username, password_hash, role FROM users WHERE username = ? AND role = "admin"',
                [username]
            );
            
            
            if (users.length === 0) {
                return null;
            }
            
            const user = users[0];
            
            const isValid = await bcrypt.compare(password, user.password_hash);
            
            if (isValid) {
                return {
                    id: user.id,
                    username: user.username,
                    role: user.role
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ [AUTH-SERVICE] Erreur validation:', error);
            console.error('❌ [AUTH-SERVICE] Stack trace:', error.stack);
            throw error;
        }
    }
    
    /**
     * Hasher un mot de passe
     */
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }
    
    /**
     * Créer un nouvel utilisateur admin
     */
    static async createAdminUser(username, password) {
        try {
            const hashedPassword = await this.hashPassword(password);
            
            const result = await query(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, "admin")',
                [username, hashedPassword]
            );
            
            return {
                id: result.insertId,
                username: username,
                role: 'admin'
            };
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }
    
    /**
     * Changer le mot de passe d'un utilisateur
     */
    static async changePassword(userId, oldPassword, newPassword) {
        try {
            // Vérifier l'ancien mot de passe
            const users = await query(
                'SELECT password_hash FROM users WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                throw new Error('Utilisateur non trouvé');
            }
            
            const isValid = await bcrypt.compare(oldPassword, users[0].password_hash);
            if (!isValid) {
                throw new Error('Ancien mot de passe incorrect');
            }
            
            // Mettre à jour avec le nouveau mot de passe
            const hashedNewPassword = await this.hashPassword(newPassword);
            await query(
                'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
                [hashedNewPassword, userId]
            );
            
            return true;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }
    
    /**
     * Logger une tentative de connexion
     */
    static async logLoginAttempt(username, success, ip) {
        try {
            // Table optionnelle pour logger les tentatives
            await query(
                `INSERT IGNORE INTO login_attempts (username, success, ip_address, attempted_at) 
                 VALUES (?, ?, ?, NOW())`,
                [username, success, ip]
            );
        } catch (error) {
            // Ignore les erreurs de log pour ne pas bloquer l'auth
            console.warn('Login attempt log failed:', error.message);
        }
    }
}