import { AuthService } from '../services/auth-service.js';

export class AuthController {
    
    /**
     * Afficher la page de connexion
     */
    static async showLogin(req, res) {
        const error = req.query.error;
        let errorMessage = '';
        
        switch (error) {
            case 'invalid_credentials':
                errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect.';
                break;
            case 'insufficient_privileges':
                errorMessage = 'Privilèges administrateur requis.';
                break;
            case 'session_expired':
                errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
                break;
        }
        
        res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Remi - Connexion Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        .logo {
            text-align: center;
            margin-bottom: 2rem;
        }
        .logo h1 {
            color: #333;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .logo p {
            color: #666;
            font-size: 0.9rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e1e5e9;
            border-radius: 5px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .error {
            background: #ffe6e6;
            color: #d32f2f;
            padding: 0.75rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            border-left: 4px solid #d32f2f;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>🤖 Bot Remi</h1>
            <p>Administration</p>
        </div>
        
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
        
        <form method="POST" action="/admin/login">
            <div class="form-group">
                <label for="username">Nom d'utilisateur</label>
                <input type="text" id="username" name="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" class="btn">Se connecter</button>
        </form>
    </div>
</body>
</html>
        `);
    }
    
    /**
     * Traiter la connexion
     */
    static async processLogin(req, res) {
        console.log('🔐 [AUTH] Tentative de connexion...');
        console.log('🔐 [AUTH] IP:', req.ip);
        console.log('🔐 [AUTH] User-Agent:', req.get('User-Agent'));
        
        try {
            const { username, password } = req.body;
            console.log('🔐 [AUTH] Username fourni:', username);
            console.log('🔐 [AUTH] Password length:', password ? password.length : 0);
            
            if (!username || !password) {
                console.log('❌ [AUTH] Champs manquants');
                return res.redirect('/admin/login?error=invalid_credentials');
            }
            
            console.log('🔐 [AUTH] Validation utilisateur...');
            const user = await AuthService.validateUser(username, password);
            console.log('🔐 [AUTH] Résultat validation:', user ? 'SUCCESS' : 'FAILED');
            
            if (user) {
                console.log('✅ [AUTH] Utilisateur valide, création session...');
                console.log('🔐 [AUTH] Session ID avant:', req.sessionID);
                
                // Créer la session
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.role = user.role;
                
                console.log('🔐 [AUTH] Session créée:', {
                    userId: req.session.userId,
                    username: req.session.username,
                    role: req.session.role
                });
                
                // Forcer la sauvegarde de la session
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ [AUTH] Erreur sauvegarde session:', err);
                        return res.redirect('/admin/login?error=invalid_credentials');
                    }
                    
                    console.log('✅ [AUTH] Session sauvegardée avec succès');
                    console.log('🔐 [AUTH] Session ID après:', req.sessionID);
                    
                    // Logger la tentative réussie
                    AuthService.logLoginAttempt(username, true, req.ip);
                    
                    console.log('🚀 [AUTH] Redirection vers /admin/dashboard');
                    // Rediriger vers le dashboard
                    res.redirect('/admin/dashboard');
                });
            } else {
                console.log('❌ [AUTH] Échec validation - identifiants incorrects');
                // Logger la tentative échouée
                await AuthService.logLoginAttempt(username, false, req.ip);
                
                res.redirect('/admin/login?error=invalid_credentials');
            }
        } catch (error) {
            console.error('❌ [AUTH] Erreur processus login:', error);
            res.redirect('/admin/login?error=invalid_credentials');
        }
    }
    
    /**
     * Déconnexion
     */
    static async logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.redirect('/admin/login');
        });
    }
}