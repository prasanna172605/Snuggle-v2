import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin
// We need to use environment variables for the service account
const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    // Handle newlines in private key which are often escaped in env vars
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();
const messaging = getMessaging();

export default async function handler(req, res) {
    // enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { receiverId, title, body, url, icon } = req.body;

        if (!receiverId || !title || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log('[API] Looking up user:', receiverId);

        // 1. Get Receiver Tokens
        // WORKAROUND: Both doc().get() and where() queries are failing in Vercel
        // So we'll scan all users to find the right one
        const cleanReceiverId = receiverId.trim();
        console.log('[API] Scanning all users to find:', cleanReceiverId, '(length:', cleanReceiverId.length, ')');
        const allUsersSnapshot = await db.collection('users').get();
        let userDoc = null;

        for (const doc of allUsersSnapshot.docs) {
            const docId = doc.id.trim();
            console.log('[API] Comparing:', docId, '(length:', docId.length, ') with', cleanReceiverId);
            if (docId === cleanReceiverId) {
                userDoc = doc;
                console.log('[API] Found user by scanning!');
                break;
            }
        }

        if (!userDoc) {
            console.log('[API] User not found after scanning', allUsersSnapshot.docs.length, 'users');
            console.log('[API] Sample user IDs:', allUsersSnapshot.docs.slice(0, 10).map(d => d.id));
            return res.status(404).json({ error: 'User not found', requestedId: receiverId });
        }

        const userData = userDoc.data();
        const fcmTokens = userData?.fcmTokens;

        console.log('[API] User found, tokens:', fcmTokens?.length || 0);

        if (!fcmTokens || !fcmTokens.length) {
            return res.status(200).json({ message: 'No tokens found for user' });
        }

        // 2. Prepare Payload
        const uniqueTokens = [...new Set(fcmTokens)];
        console.log('[API] Sending to', uniqueTokens.length, 'unique tokens (originals:', fcmTokens.length, ')');

        const message = {
            tokens: uniqueTokens,
            notification: {
                title,
                body,
            },
            android: {
                priority: 'high',
                ttl: 0, // Immediate delivery or fail
                notification: {
                    priority: 'high',
                    channelId: 'default'
                }
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                    TTL: '0'
                },
                notification: {
                    icon: icon || '/vite.svg',
                    badge: '/vite.svg',
                    data: { url: url || '/' },
                    requireInteraction: true // Keep notification active until user clicks
                },
                fcmOptions: {
                    link: url || '/'
                }
            },
        };

        // 3. Send
        const response = await messaging.sendEachForMulticast(message);

        // 4. Cleanup Invalid Tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(fcmTokens[idx]);
                }
            });

            if (failedTokens.length > 0) {
                await db.collection('users').doc(receiverId).update({
                    fcmTokens: FieldValue.arrayRemove(...failedTokens)
                });
            }
        }

        return res.status(200).json({
            success: true,
            sentCount: response.successCount,
            failureCount: response.failureCount
        });

    } catch (error) {
        console.error('Push error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
