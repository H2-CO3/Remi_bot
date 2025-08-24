import rateLimit from 'express-rate-limit';

// Rate limiting pour les tentatives de connexion
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives par IP
    message: {
        error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware pour vérifier l'authentification
export function requireAuth(req, res, next) {
    console.log('🛡️ [AUTH] RequireAuth check - URL:', req.path);
    console.log('🛡️ [AUTH] Session ID:', req.sessionID);
    console.log('🛡️ [AUTH] Session exists:', !!req.session);
    console.log('🛡️ [AUTH] UserId in session:', req.session?.userId);
    
    if (req.session && req.session.userId) {
        console.log('✅ [AUTH] Authentifié - userId:', req.session.userId);
        return next();
    } else {
        console.log('❌ [AUTH] Non authentifié - redirection');
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        } else {
            return res.redirect('/admin/login');
        }
    }
}

// Middleware pour vérifier le rôle admin
export function requireAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        return next();
    } else {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin privileges required' 
            });
        } else {
            return res.redirect('/admin/login?error=insufficient_privileges');
        }
    }
}

// Middleware pour rediriger si déjà connecté
export function redirectIfAuthenticated(req, res, next) {
    console.log('↩️ [AUTH] RedirectIfAuth check - URL:', req.path);
    console.log('↩️ [AUTH] Session ID:', req.sessionID);
    console.log('↩️ [AUTH] Session exists:', !!req.session);
    console.log('↩️ [AUTH] UserId in session:', req.session?.userId);
    
    if (req.session && req.session.userId) {
        console.log('🚀 [AUTH] Déjà connecté - redirection vers dashboard');
        return res.redirect('/admin/dashboard');
    }
    console.log('➡️ [AUTH] Non connecté - affichage login');
    next();
}