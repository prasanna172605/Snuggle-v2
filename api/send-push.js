import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin
const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    // Handle newlines in private key which are often escaped in env vars
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
        // IMPORTANT: Must specify databaseURL for RTDB
        databaseURL: "https://snuggle-73465-default-rtdb.firebaseio.com"
    });
}

const db = getDatabase();
const messaging = getMessaging();

export default async function handler(req, res) {
    // enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Validate Auth (Optional but recommended for "Backend" security)
        // const authHeader = req.headers.authorization;
        // if (!authHeader || !authHeader.startsWith('Bearer ')) {
        //    return res.status(401).json({ error: 'Unauthorized' });
        // }
        // const idToken = authHeader.split('Bearer ')[1];
        // await getAuth().verifyIdToken(idToken);

        const { receiverId, title, body, url, icon, type = 'system' } = req.body;

        if (!receiverId || !title || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`[API] Processing push for ${receiverId} (${type})`);

        // 2. Check Preferences (RTDB)
        const prefRef = db.ref(`notificationPreferences/${receiverId}`);
        const prefSnap = await prefRef.once('value');
        let prefs = {
            messages: true,
            reactions: true,
            follows: true,
            calls: true,
            system: true
        };
        if (prefSnap.exists()) {
            prefs = { ...prefs, ...prefSnap.val() };
        }

        let prefKey = 'system';
        if (['text', 'image', 'audio', 'video', 'message'].includes(type)) prefKey = 'messages';
        else if (type === 'reaction') prefKey = 'reactions';
        else if (type === 'follow') prefKey = 'follows';
        else if (type.includes('call')) prefKey = 'calls';

        // @ts-ignore
        if (prefs[prefKey] === false) {
            console.log(`[API] Suppressed by user preference: ${prefKey}`);
            return res.status(200).json({ status: 'suppressed', reason: 'User preference' });
        }

        // 3. Get Tokens (RTDB)
        // Path: /userDevices/{userId}/{deviceId}/token
        const devicesRef = db.ref(`userDevices/${receiverId}`);
        const devicesSnap = await devicesRef.once('value');

        if (!devicesSnap.exists()) {
            console.log('[API] No devices found for user');
            return res.status(200).json({ message: 'No devices found' });
        }

        const devices = devicesSnap.val();
        const tokens = Object.values(devices)
            .map((d: any) => d.token)
            .filter(t => typeof t === 'string' && t.length > 0);

        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length === 0) {
            console.log('[API] No valid tokens found');
            return res.status(200).json({ message: 'No valid tokens found' });
        }

        console.log(`[API] Sending to ${uniqueTokens.length} tokens`);

        // 4. Send Payload
        const message = {
            tokens: uniqueTokens,
            notification: {
                title,
                body,
            },
            data: {
                url: url || '/',
                type: type
            },
            android: {
                priority: 'high',
                ttl: 0,
                notification: {
                    priority: 'high',
                    channelId: 'default' // Ensure client creates this channel
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
                    // requireInteraction: true, // Optional: might be annoying for every chat
                    data: { url: url || '/' }
                },
                fcmOptions: {
                    link: url || '/'
                }
            },
        };

        const response = await messaging.sendEachForMulticast(message);

        console.log(`[API] Success: ${response.successCount}, Failed: ${response.failureCount}`);

        // 5. Cleanup Invalid Tokens (Interactive query required to map back to deviceId, skipping for simplicity)
        // Ideally, we'd loop through responses, find failed indices, look up which deviceId that token belonged to, and remove it.

        return res.status(200).json({
            success: true,
            sentCount: response.successCount,
            failureCount: response.failureCount
        });

    } catch (error) {
        console.error('[API] Push error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
