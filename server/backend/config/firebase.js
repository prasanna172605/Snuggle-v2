
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        // private_key usually contains \n which needs to be parsed correctly
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined;

        if (projectId && clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                // databaseURL: `https://${projectId}.firebaseio.com` // Optional if using Firestore
            });
            console.log('[Firebase Admin] Initialized with service account');
        } else {
            console.warn('[Firebase Admin] Missing service account credentials. Some backend features may fail.');
            // Fallback for some environments (like Cloud Functions) acting as default
            admin.initializeApp();
        }
    } catch (error) {
        console.error('[Firebase Admin] Initialization error:', error);
    }
}

export default admin;
