/**
 * Express Rate Limiting Middleware
 * In-memory sliding window rate limiter
 */

import AppError from '../utils/AppError.js';

// In-memory store: Map<key, { count, resetTime }>
const store = new Map();

// Cleanup interval — remove expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) {
            store.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param {Object} config
 * @param {number} config.maxRequests - Maximum requests allowed in the window
 * @param {number} config.windowMs - Time window in milliseconds
 * @param {string} [config.message] - Custom error message
 * @param {string} [config.keyGenerator] - 'user' (default) or 'ip'
 */
export const createRateLimiter = ({
    maxRequests,
    windowMs,
    message = 'Too many requests. Please try again later.',
    keyGenerator = 'user'
} = {}) => {
    return (req, res, next) => {
        // Generate key based on user UID or IP
        let key;
        if (keyGenerator === 'user' && req.user?.uid) {
            key = `user:${req.user.uid}:${req.baseUrl}`;
        } else {
            key = `ip:${req.ip}:${req.baseUrl}`;
        }

        const now = Date.now();
        const entry = store.get(key);

        if (!entry || now > entry.resetTime) {
            // First request or window expired — start new window
            store.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
            return next();
        }

        if (entry.count >= maxRequests) {
            // Rate limit exceeded
            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', 0);
            return next(new AppError(message, 429));
        }

        // Increment count
        entry.count++;
        store.set(key, entry);

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
        next();
    };
};

// ─── Pre-built Presets ───────────────────────────────────────────────

/**
 * Upload rate limiter: 10 uploads per minute
 */
export const uploadLimiter = createRateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000,
    message: 'Upload limit reached. Maximum 10 uploads per minute.'
});

/**
 * General API rate limiter: 100 requests per minute
 */
export const apiLimiter = createRateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000,
    message: 'API rate limit reached. Please slow down.'
});

/**
 * Auth rate limiter: 5 attempts per 15 minutes
 */
export const authLimiter = createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    keyGenerator: 'ip'
});

export default { createRateLimiter, uploadLimiter, apiLimiter, authLimiter };
