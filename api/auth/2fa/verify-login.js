import admin from 'firebase-admin';
import speakeasy from 'speakeasy';

// Initialize Firebase Admin
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
    // CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "https://snuggle-73465.web.app");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Content-Type", "application/json");

    // Handle OPTIONS
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            status: "error",
            message: "Method not allowed"
        });
    }

    try {
        const { code } = req.body;
        const authHeader = req.headers.authorization;

        if (!authHeader || !code) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields"
            });
        }

        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const uid = decoded.uid;

        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        if (!userData.twoFactorEnabled) {
            return res.status(400).json({
                status: "error",
                message: "2FA not enabled"
            });
        }

        // Verify TOTP code
        let valid = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        // Check backup codes if TOTP failed
        if (!valid && userData.twoFactorBackupCodes) {
            if (userData.twoFactorBackupCodes.includes(code)) {
                valid = true;
                // Remove used backup code
                const newCodes = userData.twoFactorBackupCodes.filter(c => c !== code);
                await db.collection('users').doc(uid).update({
                    twoFactorBackupCodes: newCodes
                });
            }
        }

        if (valid) {
            // Update login status
            await db.collection('users').doc(uid).update({
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                isOnline: true
            });

            // Get updated user data
            const updatedUserDoc = await db.collection('users').doc(uid).get();
            const updatedUserData = updatedUserDoc.data();

            return res.status(200).json({
                status: "success",
                message: "Logged in successfully",
                data: { user: updatedUserData }
            });
        } else {
            return res.status(400).json({
                status: "error",
                message: "Invalid 2FA code"
            });
        }

    } catch (error) {
        console.error('2FA verification error:', error);
        return res.status(500).json({
            status: "error",
            message: error.message || "Internal server error"
        });
    }
}
