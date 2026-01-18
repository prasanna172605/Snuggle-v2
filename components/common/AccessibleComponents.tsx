import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { trapFocus } from '@/utils/accessibility';
import { cn } from '@/lib/utils';

interface AccessibleModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * Accessible modal with focus trap and ARIA attributes
 */
export function AccessibleModal({
    isOpen,
    onClose,
    title,
    description,
    children,
    className,
}: AccessibleModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Store previous focus
        previousFocusRef.current = document.activeElement as HTMLElement;

        // Trap focus
        const cleanup = modalRef.current ? trapFocus(modalRef.current) : () => { };

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Cleanup
        return () => {
            cleanup();
            document.body.style.overflow = '';

            // Restore focus
            setTimeout(() => {
                previousFocusRef.current?.focus();
            }, 0);
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? 'modal-description' : undefined}
        >
            <div
                ref={modalRef}
                className={cn(
                    'bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto',
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 id="modal-title" className="text-lg font-semibold">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Description */}
                {description && (
                    <p id="modal-description" className="sr-only">
                        {description}
                    </p>
                )}

                {/* Content */}
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}

interface SkipLinkProps {
    targetId: string;
    children: string;
}

/**
 * Skip to main content link for keyboard users
 */
export function SkipLink({ targetId, children }: SkipLinkProps) {
    return (
        <a
            href={`#${targetId}`}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
            {children}
        </a>
    );
}

interface LiveRegionProps {
    message: string;
    priority?: 'polite' | 'assertive';
}

/**
 * ARIA live region for dynamic announcements
 */
export function LiveRegion({ message, priority = 'polite' }: LiveRegionProps) {
    return (
        <div
            aria-live={priority}
            aria-atomic="true"
            className="sr-only"
        >
            {message}
        </div>
    );
}

export default {
    AccessibleModal,
    SkipLink,
    LiveRegion,
};
