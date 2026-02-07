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
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${diffYears}y ago`;
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
