/**
 * Error Tracking with Sentry
 * Capture and report errors in production
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { config, isProduction } from '@/config/environment';

/**
 * Initialize Sentry error tracking
 */
export function initErrorTracking(): void {
    if (!isProduction) {
        console.log('[Sentry] Skipping initialization in non-production environment');
        return;
    }

    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: config.env,
        integrations: [
            new BrowserTracing(),
            new Sentry.Replay({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Performance Monitoring
        tracesSampleRate: isProduction ? 0.1 : 1.0,

        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Release tracking
        release: import.meta.env.VITE_APP_VERSION || 'unknown',

        // Filter out known noise
        beforeSend(event, hint) {
            // Don't send errors from browser extensions
            if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
                frame => frame.filename?.includes('extensions/')
            )) {
                return null;
            }

            // Don't send network errors (handled separately)
            if (event.exception?.values?.[0]?.type === 'NetworkError') {
                return null;
            }

            return event;
        },

        // Privacy: Don't send PII
        beforeBreadcrumb(breadcrumb) {
            // Strip query parameters
            if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
                breadcrumb.data.to = breadcrumb.data.to.split('?')[0];
            }

            return breadcrumb;
        },
    });

    // Set user context (non-PII only)
    Sentry.setContext('app', {
        environment: config.env,
        features: config.features,
    });
}

/**
 * Set user identifier (hashed)
 */
export function setUserContext(userId: string): void {
    if (!isProduction) return;

    Sentry.setUser({
        id: hashUserId(userId),
    });
}

/**
 * Clear user context on logout
 */
export function clearUserContext(): void {
    if (!isProduction) return;

    Sentry.setUser(null);
}

/**
 * Capture error manually
 */
export function captureError(error: Error, context?: Record<string, any>): void {
    if (!isProduction) {
        console.error('[Error]', error, context);
        return;
    }

    Sentry.captureException(error, {
        tags: context,
    });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (!isProduction) return;

    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
    });
}

/**
 * Hash user ID for privacy
 */
function hashUserId(userId: string): string {
    // Simple hash for privacy (not cryptographic)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `user_${Math.abs(hash)}`;
}

export default {
    initErrorTracking,
    setUserContext,
    clearUserContext,
    captureError,
    addBreadcrumb,
};
