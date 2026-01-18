/**
 * Cloud Functions Structured Logging
 * Privacy-focused, searchable Firebase logs
 */

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

interface LogContext {
    feature?: string;
    userId?: string;
    action?: string;
    duration?: number;
    [key: string]: any;
}

/**
 * Structured logger for Cloud Functions
 */
class CloudLogger {
    private environment: string;

    constructor() {
        this.environment = process.env.GCLOUD_PROJECT?.includes('prod')
            ? 'production'
            : process.env.GCLOUD_PROJECT?.includes('staging')
                ? 'staging'
                : 'development';
    }

    private sanitize(context: LogContext): LogContext {
        const sanitized = { ...context };

        // Remove sensitive fields
        const forbidden = ['password', 'token', 'secret', 'apiKey', 'credential', 'messageContent'];
        forbidden.forEach(field => {
            if (field in sanitized) {
                delete sanitized[field];
            }
        });

        // Mask userId in production
        if (this.environment === 'production' && sanitized.userId) {
            sanitized.userId = sanitized.userId.substring(0, 8) + '***';
        }

        return sanitized;
    }

    private format(level: LogLevel, message: string, context?: LogContext) {
        return {
            severity: level.toUpperCase(),
            message,
            environment: this.environment,
            timestamp: new Date().toISOString(),
            ...this.sanitize(context || {}),
        };
    }

    debug(message: string, context?: LogContext): void {
        if (this.environment === 'production') return;
        console.log(JSON.stringify(this.format(LogLevel.DEBUG, message, context)));
    }

    info(message: string, context?: LogContext): void {
        console.log(JSON.stringify(this.format(LogLevel.INFO, message, context)));
    }

    warn(message: string, context?: LogContext): void {
        console.warn(JSON.stringify(this.format(LogLevel.WARN, message, context)));
    }

    error(message: string, error?: Error, context?: LogContext): void {
        const log = this.format(LogLevel.ERROR, message, {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: this.environment !== 'production' ? error.stack : undefined,
            } : undefined,
        });

        console.error(JSON.stringify(log));
    }

    /**
     * Log Cloud Function execution
     */
    functionCall(functionName: string, duration: number, success: boolean, context?: LogContext): void {
        this.info(`Function ${functionName} ${success ? 'completed' : 'failed'}`, {
            ...context,
            function: functionName,
            duration,
            success,
        });
    }

    /**
     * Log rate limit event
     */
    rateLimitTriggered(userId: string, action: string): void {
        this.warn('Rate limit triggered', {
            userId,
            action,
            feature: 'rate-limiting',
        });
    }

    /**
     * Log security event
     */
    securityEvent(event: string, userId?: string, context?: LogContext): void {
        this.warn(`Security event: ${event}`, {
            ...context,
            userId,
            feature: 'security',
            event,
        });
    }
}

export const logger = new CloudLogger();

export default logger;
