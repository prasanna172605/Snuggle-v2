/**
 * Security Monitoring & Logging
 */

interface SecurityEvent {
    type: 'auth_failure' | 'permission_denied' | 'rate_limit' | 'invalid_input' | 'suspicious_activity';
    userId?: string;
    action: string;
    details: string;
    timestamp: number;
    ip?: string;
}

/**
 * Log security events
 */
export function logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
        ...event,
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.warn('[SECURITY]', logEntry);
    }

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
        // Send to Firebase Analytics or external logging service
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'security_event', {
                event_category: 'Security',
                event_label: event.type,
                value: event.action,
            });
        }
    }
}

/**
 * Detect suspicious patterns
 */
export class SuspiciousActivityDetector {
    private activityLog: Map<string, number[]> = new Map();

    /**
     * Track user action
     */
    trackAction(userId: string, action: string): boolean {
        const key = `${userId}:${action}`;
        const now = Date.now();
        const windowMs = 60000; // 1 minute

        const timestamps = this.activityLog.get(key) || [];
        const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);

        recentTimestamps.push(now);
        this.activityLog.set(key, recentTimestamps);

        // Flag if more than 100 actions in 1 minute
        if (recentTimestamps.length > 100) {
            logSecurityEvent({
                type: 'suspicious_activity',
                userId,
                action,
                details: `Excessive ${action} attempts detected`,
                timestamp: now,
            });
            return true;
        }

        return false;
    }

    /**
     * Clear activity log
     */
    clear(): void {
        this.activityLog.clear();
    }
}

export const activityDetector = new SuspiciousActivityDetector();

/**
 * Audit logger for critical actions
 */
export class AuditLogger {
    /**
     * Log critical action
     */
    static log(action: string, userId: string, details: Record<string, any>): void {
        const auditEntry = {
            action,
            userId,
            details,
            timestamp: Date.now(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        };

        if (process.env.NODE_ENV === 'development') {
            console.log('[AUDIT]', auditEntry);
        }

        // In production, save to database or external service
        // Firebase Realtime Database or Firestore audit log
    }
}

/**
 * Monitor authentication failures
 */
export function monitorAuthFailure(reason: string): void {
    logSecurityEvent({
        type: 'auth_failure',
        action: 'login_attempt',
        details: reason,
        timestamp: Date.now(),
    });
}

/**
 * Monitor permission denials
 */
export function monitorPermissionDenial(userId: string, resource: string): void {
    logSecurityEvent({
        type: 'permission_denied',
        userId,
        action: resource,
        details: `Access denied to ${resource}`,
        timestamp: Date.now(),
    });
}

export default {
    logSecurityEvent,
    SuspiciousActivityDetector,
    activityDetector,
    AuditLogger,
    monitorAuthFailure,
    monitorPermissionDenial,
};
