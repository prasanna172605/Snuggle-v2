/**
 * XSS Prevention Tests
 * Tests input sanitization and output escaping
 */

import { sanitizeText, sanitizeHTML } from '@/utils/security';
import { render, screen } from '@/utils/testUtils';

describe('XSS Prevention', () => {
    describe('sanitizeText', () => {
        it('removes script tags', () => {
            const malicious = '<script>alert("XSS")</script>';
            const sanitized = sanitizeText(malicious);

            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('alert');
        });

        it('removes img onerror handlers', () => {
            const malicious = '<img src=x onerror=alert(1)>';
            const sanitized = sanitizeText(malicious);

            expect(sanitized).not.toContain('onerror');
            expect(sanitized).not.toContain('alert');
        });

        it('removes javascript: URLs', () => {
            const malicious = '<a href="javascript:alert(1)">Click</a>';
            const sanitized = sanitizeText(malicious);

            expect(sanitized).not.toContain('javascript:');
        });

        it('removes event handlers', () => {
            const malicious = '<div onclick="alert(1)">Click me</div>';
            const sanitized = sanitizeText(malicious);

            expect(sanitized).not.toContain('onclick');
        });

        it('allows safe HTML entities', () => {
            const safe = 'Hello &lt;world&gt;';
            const sanitized = sanitizeText(safe);

            expect(sanitized).toBe('Hello &lt;world&gt;');
        });
    });

    describe('Message Display', () => {
        it('does not execute scripts in message content', () => {
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

            render(<div dangerouslySetInnerHTML={{ __html: sanitizeHTML('<script>alert(1)</script>') }} />);

        expect(alertSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it('escapes user input in messages', () => {
        const MessageComponent = ({ text }: { text: string }) => (
            <div>{ text } </div>
        );

        render(<MessageComponent text='<script>alert("XSS")</script>' />);

        // React escapes by default
        expect(screen.getByText(/<script>alert\("XSS"\)<\/script>/)).toBeInTheDocument();
    });
});

describe('Search Input', () => {
    it('sanitizes search query', () => {
        const query = '<img src=x onerror=alert(1)>';
        const sanitized = sanitizeText(query);

        expect(sanitized).not.toContain('onerror');
    });
});

describe('Profile Fields', () => {
    it('sanitizes bio field', () => {
        const bio = 'Hello <script>alert("XSS")</script> world';
        const sanitized = sanitizeText(bio);

        expect(sanitized).not.toContain('<script>');
        expect(sanitized).toContain('Hello');
        expect(sanitized).toContain('world');
    });

    it('sanitizes username field', () => {
        const username = 'admin<script>alert(1)</script>';
        const sanitized = sanitizeText(username);

        expect(sanitized).not.toContain('<script>');
    });
});
});
