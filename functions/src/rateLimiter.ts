/**
 * Rate Limiting for Cloud Functions
 * Prevent abuse and spam
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

/**
 * Rate limiter using Realtime Database
 */
export class FirebaseRateLimiter {
    private rateLimitRef: admin.database.Reference;

    constructor(private config: RateLimitConfig) {
        this.rateLimitRef = admin.database().ref('_rateLimits');
    }

    /**
     * Check if request is allowed for user
     */
    async isAllowed(userId: string, action: string): Promise<boolean> {
        const key = `${userId}:${action}`;
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        const snapshot = await this.rateLimitRef.child(key).once('value');
        const timestamps: number[] = snapshot.val() || [];

        // Remove old timestamps
        const validTimestamps = timestamps.filter(ts => ts > windowStart);

        if (validTimestamps.length >= this.config.maxRequests) {
            return false;
        }

        // Add current timestamp
        validTimestamps.push(now);
        await this.rateLimitRef.child(key).set(validTimestamps);

        // Cleanup old entries after 1 hour
        setTimeout(() => {
            this.rateLimitRef.child(key).remove();
        }, 3600000);

        return true;
    }
}

/**
 * Rate limit middleware for Cloud Functions
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
    const limiter = new FirebaseRateLimiter(config);

    return async (
        req: functions.https.Request,
        res: functions.Response,
        next: () => void
    ) => {
        const userId = req.body.userId || req.query.userId;
        const action = req.path;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const allowed = await limiter.isAllowed(userId as string, action);

        if (!allowed) {
            res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
            return;
        }

        next();
    };
}

/**
 * Message rate limiter (10 messages per minute)
 */
export const messageRateLimiter = new FirebaseRateLimiter({
    maxRequests: 10,
    windowMs: 60000, // 1 minute
});

/**
 * Notification rate limiter (20 per hour)
 */
export const notificationRateLimiter = new FirebaseRateLimiter({
    maxRequests: 20,
    windowMs: 3600000, // 1 hour
});

/**
 * Call signaling rate limiter (50 signals per minute)
 */
export const callSignalRateLimiter = new FirebaseRateLimiter({
    maxRequests: 50,
    windowMs: 60000,
});

export default {
    FirebaseRateLimiter,
    rateLimitMiddleware,
    messageRateLimiter,
    notificationRateLimiter,
    callSignalRateLimiter,
};
