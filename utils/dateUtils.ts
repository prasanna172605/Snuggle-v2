// Date utility functions for formatting timestamps

/**
 * Formats a date/timestamp into a relative time string (e.g., "2h ago", "3d ago")
 * @param timestamp - Date object, ISO string, or Unix timestamp (ms)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: Date | string | number | undefined): string {
    if (!timestamp) return '';

    const date = typeof timestamp === 'string' || typeof timestamp === 'number'
        ? new Date(timestamp)
        : timestamp;

    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        return formatRelativeTime((timestamp as any).toDate());
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 5) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    // If > 24 hours, return formatted date
    return formatDate(date);
}

/**
 * Formats a date for display (e.g., "Feb 7, 2026")
 */
export function formatDate(timestamp: Date | string | number | undefined): string {
    if (!timestamp) return '';

    const date = typeof timestamp === 'string' || typeof timestamp === 'number'
        ? new Date(timestamp)
        : timestamp;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Formats a date for chat headers (Today, Yesterday, Date)
 */
export function formatDateHeader(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }
}
