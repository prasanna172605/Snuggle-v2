import { getFirebaseErrorMessage } from './errorService';
import ToastService from './toastService';

/**
 * Global error handler for the application
 * Centralizes error logging and user feedback
 */

class GlobalErrorHandler {
    /**
     * Handle Firebase errors with user-friendly toasts
     */
    handleFirebaseError(error: unknown, context?: string): void {
        const message = getFirebaseErrorMessage(error);
        const description = context ? `Context: ${context}` : undefined;

        console.error('Firebase error:', error);
        ToastService.error(message, description);
    }

    /**
     * Handle API/fetch errors
     */
    handleAPIError(error: unknown, context?: string): void {
        let message = 'Something went wrong. Please try again.';

        if (error instanceof Error) {
            message = error.message;
        }

        console.error('API error:', error);
        ToastService.error(message, context);
    }

    /**
     * Handle unknown errors
     */
    handleUnknownError(error: unknown, context?: string): void {
        console.error('Unknown error:', error);
        ToastService.error(
            'An unexpected error occurred',
            context || 'Please try again or contact support if the issue persists'
        );
    }

    /**
     * Generic error handler - auto-detects error type
     */
    handle(error: unknown, context?: string): void {
        // Firebase errors
        if (error && typeof error === 'object' && 'code' in error) {
            this.handleFirebaseError(error, context);
            return;
        }

        // Standard errors
        if (error instanceof Error) {
            this.handleAPIError(error, context);
            return;
        }

        // Unknown errors
        this.handleUnknownError(error, context);
    }

    /**
     * Setup global error listeners
     */
    setupGlobalListeners(): void {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handle(event.reason, 'Unhandled Promise');
            event.preventDefault();
        });

        // Catch global errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            // Don't show toast for every script error, just log it
            event.preventDefault();
        });
    }
}

export const errorHandler = new GlobalErrorHandler();

export default errorHandler;
