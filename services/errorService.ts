import { FirebaseError } from 'firebase/app';

/**
 * Firebase Error Codes → User-Friendly Messages
 * Maps Firebase error codes to actionable, non-technical messages
 */

export const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
    // Auth errors
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/requires-recent-login': 'Please sign in again to continue.',

    // Firestore errors
    'permission-denied': 'You don\'t have permission to perform this action.',
    'not-found': 'The requested data could not be found.',
    'already-exists': 'This item already exists.',
    'resource-exhausted': 'Too many requests. Please try again later.',
    'unauthenticated': 'Please sign in to continue.',
    'unavailable': 'Service temporarily unavailable. Please try again.',
    'deadline-exceeded': 'Request timed out. Please try again.',

    // Storage errors
    'storage/unauthorized': 'You don\'t have permission to access this file.',
    'storage/canceled': 'Upload was canceled.',
    'storage/quota-exceeded': 'Storage quota exceeded. Please contact support.',
    'storage/unknown': 'An unknown error occurred. Please try again.',
    'storage/object-not-found': 'File not found.',
    'storage/bucket-not-found': 'Storage bucket not found.',
    'storage/unauthenticated': 'Please sign in to upload files.',

    // RTDB errors
    'PERMISSION_DENIED': 'You don\'t have permission to access this data.',
    'NETWORK_ERROR': 'Network error. Please check your connection.',

    // Generic
    'offline': 'You\'re offline. Please check your internet connection.',
    'unknown': 'Something went wrong. Please try again.',
};

/**
 * Get user-friendly error message from Firebase error
 */
export function getFirebaseErrorMessage(error: unknown): string {
    if (error instanceof FirebaseError) {
        const message = FIREBASE_ERROR_MESSAGES[error.code];
        if (message) return message;

        // Fallback to error message if available
        if (error.message && !error.message.includes('Firebase')) {
            return error.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return FIREBASE_ERROR_MESSAGES.unknown;
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
    if (error instanceof FirebaseError) {
        return error.code === 'permission-denied' ||
            error.code === 'auth/unauthorized' ||
            error.code === 'storage/unauthorized';
    }
    return false;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof FirebaseError) {
        return error.code === 'auth/network-request-failed' ||
            error.code === 'unavailable' ||
            error.code === 'NETWORK_ERROR';
    }
    return false;
}

/**
 * Check if user is offline
 */
export function isOfflineError(error: unknown): boolean {
    if (error instanceof Error) {
        return error.message.toLowerCase().includes('offline') ||
            error.message.toLowerCase().includes('network');
    }
    return false;
}

export default {
    getFirebaseErrorMessage,
    isPermissionError,
    isNetworkError,
    isOfflineError,
};
