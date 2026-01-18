/**
 * Structured Logging System
 * Privacy-focused, searchable logs
 */

import { config, isDevelopment, isProduction } from '@/config/environment';

// Extend Window interface for Sentry
declare global {
    interface Window {
        Sentry?: any;
    }
}

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

export interface LogContext {
    feature?: string;
    userId?: string;
    action?: string;
    duration?: number;
    environment?: string;
    [key: string]: any;
}

/**
 * Structured logger with privacy safeguards
 */
class Logger {
    private sanitizeContext(context: LogContext): LogContext {
        const sanitized = { ...context };

        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
        sensitiveFields.forEach(field => {
            if (field in sanitized) {
                delete sanitized[field];
            }
        });

        // Mask userId in production
        if (isProduction && sanitized.userId) {
            sanitized.userId = sanitized.userId.substring(0, 8) + '...';
        }

        return sanitized;
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        const currentLevelIdx = levels.indexOf(config.logging.level as LogLevel);
        const messageLevelIdx = levels.indexOf(level);

        return messageLevelIdx >= currentLevelIdx;
    }

    private formatLog(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString();
        const sanitizedContext = context ? this.sanitizeContext(context) : {};

        return {
            timestamp,
            level,
            message,
            environment: config.env,
            ...sanitizedContext,
        };
    }

    debug(message: string, context?: LogContext): void {
        if (!this.shouldLog(LogLevel.DEBUG)) return;

        const log = this.formatLog(LogLevel.DEBUG, message, context);
        console.debug('[DEBUG]', log);
    }

    info(message: string, context?: LogContext): void {
        if (!this.shouldLog(LogLevel.INFO)) return;

        const log = this.formatLog(LogLevel.INFO, message, context);
        console.info('[INFO]', log);
    }

    warn(message: string, context?: LogContext): void {
        if (!this.shouldLog(LogLevel.WARN)) return;

        const log = this.formatLog(LogLevel.WARN, message, context);
        console.warn('[WARN]', log);
    }

    error(message: string, error?: Error, context?: LogContext): void {
        if (!this.shouldLog(LogLevel.ERROR)) return;

        const log = this.formatLog(LogLevel.ERROR, message, {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: isDevelopment ? error.stack : undefined,
            } : undefined,
        });

        console.error('[ERROR]', log);

        // Send to error tracking service
        if (window.Sentry && isProduction) {
            window.Sentry.captureException(error || new Error(message), {
                tags: {
                    feature: context?.feature,
                    action: context?.action,
                },
            });
        }
    }

    /**
     * Log performance metric
     */
    metric(name: string, value: number, context?: LogContext): void {
        this.info(`Performance: ${name}`, {
            ...context,
            metric: name,
            value,
            duration: value,
        });

        // Send to analytics
        if (config.analytics.enabled && typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'timing_complete', {
                name,
                value: Math.round(value),
                event_category: 'Performance',
                event_label: context?.feature,
            });
        }
    }

    /**
     * Log user action
     */
    action(action: string, context?: LogContext): void {
        this.info(`User action: ${action}`, {
            ...context,
            action,
        });
    }
}

export const logger = new Logger();

export default logger;
