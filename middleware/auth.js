
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
// Note: In server.js context, initialization happens elsewhere or we check here
if (admin.apps.length === 0) {
    // In a real scenario, credentials should be properly loaded.
    // For this local cached middleware, we rely on the main server to have init,
    // or we check process.env.
    console.warn("Firebase Admin not initialized in middleware - assuming server.js handles it");
}

/**
 * Middleware to verify Firebase ID Token from Authorization header
 */
export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verify token using Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Attach user data to request
        req.user = decodedToken;

        console.log(`[Auth] Verified user: ${decodedToken.uid}`);
        next();
    } catch (error) {
        console.error('[Auth] Token verification failed:', error);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }

        return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
};

/**
 * Middleware to check for specific roles
 * Requires custom claims on Firebase token or a separate DB lookup
 * For this MVP, checks if the claim 'role' exists or if the UID matches an admin list
 */
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userRole = req.user.role || 'user'; // Default to user if not set in custom claims

        if (allowedRoles.includes(userRole)) {
            next();
        } else {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
    };
};
