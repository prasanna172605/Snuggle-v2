import {
    sanitizeText,
    sanitizeUsername,
    escapeHtml,
    validateMessage,
    validateFile,
} from '@/utils/security';

describe('Security Utilities', () => {
    describe('sanitizeText', () => {
        it('removes script tags', () => {
            const malicious = '<script>alert("xss")</script>Hello';
            const sanitized = sanitizeText(malicious);
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).toContain('Hello');
        });

        it('removes event handlers', () => {
            const malicious = '<div onclick="alert()">Test</div>';
            const sanitized = sanitizeText(malicious);
            expect(sanitized).not.toMatch(/onclick=/i);
        });

        it('limits text length', () => {
            const longText = 'a'.repeat(2000);
            const sanitized = sanitizeText(longText, 100);
            expect(sanitized.length).toBeLessThanOrEqual(100);
        });

        it('removes control characters', () => {
            const text = 'Hello\x00World\x1F';
            const sanitized = sanitizeText(text);
            expect(sanitized).toBe('HelloWorld');
        });
    });

    describe('sanitizeUsername', () => {
        it('allows valid username', () => {
            expect(sanitizeUsername('john_doe123')).toBe('john_doe123');
        });

        it('removes special characters', () => {
            expect(sanitizeUsername('john@doe!')).toBe('johndoe');
        });

        it('limits length to 20 chars', () => {
            const long = 'a'.repeat(30);
            expect(sanitizeUsername(long).length).toBe(20);
        });
    });

    describe('escapeHtml', () => {
        it('escapes dangerous characters', () => {
            const html = '<div>"test" & \'data\'</div>';
            const escaped = escapeHtml(html);

            expect(escaped).toContain('&lt;');
            expect(escaped).toContain('&gt;');
            expect(escaped).toContain('&quot;');
            expect(escaped).toContain('&amp;');
            expect(escaped).toContain('&#x27;');
        });
    });

    describe('validateMessage', () => {
        it('accepts valid message', () => {
            const result = validateMessage('Hello, world!');
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('rejects empty message', () => {
            const result = validateMessage('   ');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('rejects too long message', () => {
            const longMessage = 'a'.repeat(6000);
            const result = validateMessage(longMessage);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('too long');
        });
    });

    describe('validateFile', () => {
        it('accepts valid image', () => {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
            Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

            const result = validateFile(file);
            expect(result.valid).toBe(true);
        });

        it('rejects file too large', () => {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
            Object.defineProperty(file, 'size', { value: 20 * 1024 * 1024 }); // 20MB

            const result = validateFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('too large');
        });

        it('rejects invalid file type', () => {
            const file = new File([''], 'test.exe', { type: 'application/exe' });

            const result = validateFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid file type');
        });
    });
});
