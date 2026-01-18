/**
 * Input Sanitization & Validation Utilities
 * Protect against XSS, injection, and malformed data
 */

/**
 * Sanitize text input - remove dangerous characters
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Remove script tags and event handlers
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, maxLength);

    return sanitized;
}

/**
 * Sanitize username - alphanumeric, underscore, hyphen only
 */
export function sanitizeUsername(username: string): string {
    if (!username || typeof username !== 'string') return '';

    // Only allow alphanumeric, underscore, hyphen
    const sanitized = username.replace(/[^a-zA-Z0-9_-]/g, '');

    // Limit length (3-20 chars)
    return sanitized.substring(0, 20);
}

/**
 * Sanitize HTML - escape dangerous characters
 */
export function escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') return '';

    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Validate URL - only allow safe protocols
 */
export function sanitizeUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    try {
        const parsed = new URL(url);

        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }

        return parsed.href;
    } catch {
        return null;
    }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Sanitize object - remove undefined and null values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): Partial<T> {
    const sanitized: Partial<T> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
            sanitized[key as keyof T] = value;
        }
    }

    return sanitized;
}

/**
 * Validate message content
 */
export function validateMessage(content: string): { valid: boolean; error?: string } {
    if (!content || typeof content !== 'string') {
        return { valid: false, error: 'Message cannot be empty' };
    }

    if (content.length > 5000) {
        return { valid: false, error: 'Message is too long (max 5000 characters)' };
    }

    if (content.trim().length === 0) {
        return { valid: false, error: 'Message cannot be empty' };
    }

    return { valid: true };
}

/**
 * Validate file upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File is too large (max 10MB)' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Only images allowed.' };
    }

    return { valid: true };
}

/**
 * Rate limit checker (client-side)
 */
export class ClientRateLimiter {
    private actions: Map<string, number[]> = new Map();

    /**
     * Check if action is allowed
     * @param actionKey - Unique key for this action
     * @param maxActions - Maximum actions allowed
     * @param windowMs - Time window in milliseconds
     */
    isAllowed(actionKey: string, maxActions: number, windowMs: number): boolean {
        const now = Date.now();
        const timestamps = this.actions.get(actionKey) || [];

        // Remove old timestamps outside the window
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

        if (validTimestamps.length >= maxActions) {
            return false;
        }

        // Add current timestamp
        validTimestamps.push(now);
        this.actions.set(actionKey, validTimestamps);

        return true;
    }

    /**
     * Clear all rate limits
     */
    clear(): void {
        this.actions.clear();
    }
}

export const rateLimiter = new ClientRateLimiter();

export default {
    sanitizeText,
    sanitizeUsername,
    escapeHtml,
    sanitizeUrl,
    isValidEmail,
    sanitizeObject,
    validateMessage,
    validateFile,
    rateLimiter,
};
