import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error) {
        console.error('Firebase init error:', error);
    }
}

export default async function handler(req, res) {
    // CORS Headers (CRITICAL - MUST BE FIRST)
    res.setHeader("Access-Control-Allow-Origin", "https://snuggle-73465.web.app");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Content-Type", "application/json");

    // Handle OPTIONS (Preflight)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== "POST") {
        return res.status(405).json({
            status: "error",
            message: "Method not allowed"
        });
    }

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: "error",
                message: "No token provided"
            });
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verify Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Get User from Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                status: "error",
                message: "User not found in database"
            });
        }

        const userData = userDoc.data();

        // Check if 2FA is enabled
        if (userData.twoFactorEnabled) {
            return res.status(200).json({
                status: "2fa_required",
                message: "Two-factor authentication required"
            });
        }

        // Update last login
        await db.collection('users').doc(uid).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            isOnline: true
        });

        // Get updated user data with proper timestamps
        const updatedUserDoc = await db.collection('users').doc(uid).get();
        const updatedUserData = updatedUserDoc.data();

        return res.status(200).json({
            status: "success",
            message: "Logged in successfully",
            token: idToken,
            data: {
                user: updatedUserData
            }
        });

    } catch (error) {
        console.error('Login error:', error);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                status: "error",
                message: "Token expired"
            });
        }

        return res.status(500).json({
            status: "error",
            message: error.message || "Internal server error"
        });
    }
}
