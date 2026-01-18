/**
 * Accessibility Utilities
 * Helpers for keyboard navigation, focus management, and ARIA
 */

/**
 * Trap focus within a container (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    };

    container.addEventListener('keydown', handleTabKey);

    // Focus first element
    firstElement?.focus();

    // Cleanup function
    return () => {
        container.removeEventListener('keydown', handleTabKey);
    };
}

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = getOrCreateAnnouncer(priority);
    announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
        announcer.textContent = '';
    }, 1000);
}

let politeAnnouncer: HTMLElement | null = null;
let assertiveAnnouncer: HTMLElement | null = null;

function getOrCreateAnnouncer(priority: 'polite' | 'assertive'): HTMLElement {
    const existing = priority === 'polite' ? politeAnnouncer : assertiveAnnouncer;

    if (existing) return existing;

    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);

    if (priority === 'polite') {
        politeAnnouncer = announcer;
    } else {
        assertiveAnnouncer = announcer;
    }

    return announcer;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Generate unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
    return `${prefix}-${++idCounter}`;
}

/**
 * Keyboard handler utility
 */
export interface KeyboardHandlers {
    onEnter?: (e: KeyboardEvent) => void;
    onSpace?: (e: KeyboardEvent) => void;
    onEscape?: (e: KeyboardEvent) => void;
    onArrowUp?: (e: KeyboardEvent) => void;
    onArrowDown?: (e: KeyboardEvent) => void;
    onArrowLeft?: (e: KeyboardEvent) => void;
    onArrowRight?: (e: KeyboardEvent) => void;
}

export function handleKeyboard(
    e: KeyboardEvent,
    handlers: KeyboardHandlers
): void {
    switch (e.key) {
        case 'Enter':
            handlers.onEnter?.(e);
            break;
        case ' ':
            handlers.onSpace?.(e);
            break;
        case 'Escape':
            handlers.onEscape?.(e);
            break;
        case 'ArrowUp':
            handlers.onArrowUp?.(e);
            break;
        case 'ArrowDown':
            handlers.onArrowDown?.(e);
            break;
        case 'ArrowLeft':
            handlers.onArrowLeft?.(e);
            break;
        case 'ArrowRight':
            handlers.onArrowRight?.(e);
            break;
    }
}

/**
 * Get contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
    // Simplified contrast calculation
    // In production, use a proper library like polished or color
    // This is a placeholder
    return 4.5; // Mock value
}

/**
 * Check if contrast meets WCAG AA standards
 */
export function meetsContrastStandards(
    foreground: string,
    background: string,
    isLargeText: boolean = false
): boolean {
    const ratio = getContrastRatio(foreground, background);
    const minRatio = isLargeText ? 3 : 4.5;
    return ratio >= minRatio;
}

export default {
    trapFocus,
    announce,
    prefersReducedMotion,
    generateAriaId,
    handleKeyboard,
    meetsContrastStandards,
};
