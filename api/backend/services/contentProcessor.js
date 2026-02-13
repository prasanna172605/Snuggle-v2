/**
 * Content Processing Service
 * Server-side sanitization, moderation, and validation
 */

// ─── Text Sanitization ──────────────────────────────────────────────

// HTML entities to escape for XSS prevention
const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
};

/**
 * Sanitize text content — strip dangerous HTML, normalize whitespace
 * @param {string} text - Raw user input
 * @returns {string} Sanitized text
 */
export const sanitizeText = (text) => {
    if (!text || typeof text !== 'string') return '';

    let sanitized = text;

    // 1. Escape HTML entities
    sanitized = sanitized.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char]);

    // 2. Remove script tags and event handlers (double safety after escaping)
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // 3. Remove data: URIs (potential XSS vector)
    sanitized = sanitized.replace(/data:\s*[^,;]+;base64/gi, '');

    // 4. Normalize whitespace (collapse multiple spaces/newlines)
    sanitized = sanitized.replace(/\s{3,}/g, '  ');
    sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

    // 5. Trim
    sanitized = sanitized.trim();

    return sanitized;
};

// ─── Content Moderation ─────────────────────────────────────────────

// Basic deny-list for content moderation (hashed for performance)
// In production, use a proper moderation API (e.g., Perspective API, OpenAI Moderation)
const BLOCKED_PATTERNS = [
    // Slurs and hate speech patterns (redacted, using pattern matching)
    /\b(kill\s+yourself|kys)\b/gi,
    /\b(bomb\s+threat|terroris[tm])\b/gi,
    /\b(child\s+porn|cp\b)/gi,
];

/**
 * Moderate content for violations
 * @param {string} text - Text to check
 * @returns {{ safe: boolean, reason?: string }}
 */
export const moderateContent = (text) => {
    if (!text || typeof text !== 'string') return { safe: true };

    const normalized = text.toLowerCase().trim();

    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(normalized)) {
            return {
                safe: false,
                reason: 'Content violates community guidelines'
            };
        }
    }

    // Check for excessive caps (spam indicator)
    if (text.length > 20) {
        const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
        if (capsRatio > 0.8) {
            return {
                safe: false,
                reason: 'Excessive use of capital letters detected'
            };
        }
    }

    // Check for repetitive characters (spam indicator)
    if (/(.)\1{10,}/i.test(text)) {
        return {
            safe: false,
            reason: 'Repetitive content detected'
        };
    }

    return { safe: true };
};

// ─── Media Validation ───────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
];

const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
];

const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
];

const ALL_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024,     // 10MB
    video: 50 * 1024 * 1024,     // 50MB
    document: 20 * 1024 * 1024,  // 20MB
};

/**
 * Validate media MIME type
 * @param {string} mimeType
 * @param {string[]} [allowedTypes] - Override allowed types
 * @returns {{ valid: boolean, category?: string, error?: string }}
 */
export const validateMediaType = (mimeType, allowedTypes = ALL_MEDIA_TYPES) => {
    if (!mimeType) {
        return { valid: false, error: 'MIME type is required' };
    }

    if (!allowedTypes.includes(mimeType)) {
        return {
            valid: false,
            error: `Unsupported file type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}`
        };
    }

    // Determine category
    let category = 'document';
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) category = 'image';
    else if (ALLOWED_VIDEO_TYPES.includes(mimeType)) category = 'video';

    return { valid: true, category };
};

/**
 * Validate file size based on category
 * @param {number} sizeBytes - File size in bytes
 * @param {string} category - 'image', 'video', or 'document'
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateFileSize = (sizeBytes, category) => {
    const limit = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.document;

    if (sizeBytes > limit) {
        const limitMB = (limit / 1024 / 1024).toFixed(0);
        return {
            valid: false,
            error: `File too large. Maximum for ${category}: ${limitMB}MB`
        };
    }

    return { valid: true };
};

/**
 * Process media metadata from an uploaded file object (multer)
 * @param {Object} file - Multer file object
 * @returns {{ valid: boolean, metadata?: Object, error?: string }}
 */
export const processMediaMetadata = (file) => {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Validate MIME type
    const typeCheck = validateMediaType(file.mimetype);
    if (!typeCheck.valid) return { valid: false, error: typeCheck.error };

    // Validate size
    const sizeCheck = validateFileSize(file.size, typeCheck.category);
    if (!sizeCheck.valid) return { valid: false, error: sizeCheck.error };

    return {
        valid: true,
        metadata: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            category: typeCheck.category,
        }
    };
};

export default {
    sanitizeText,
    moderateContent,
    validateMediaType,
    validateFileSize,
    processMediaMetadata,
};
