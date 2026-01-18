import { toast } from 'sonner';

/**
 * Centralized toast notification service
 * Provides consistent user feedback across the app
 */

export const ToastService = {
    /**
     * Success notification (green, auto-dismiss 3s)
     */
    success: (message: string, description?: string) => {
        toast.success(message, {
            description,
            duration: 3000,
        });
    },

    /**
     * Error notification (red, auto-dismiss 5s)
     */
    error: (message: string, description?: string) => {
        toast.error(message, {
            description,
            duration: 5000,
        });
    },

    /**
     * Info notification (blue, auto-dismiss 3s)
     */
    info: (message: string, description?: string) => {
        toast.info(message, {
            description,
            duration: 3000,
        });
    },

    /**
     * Warning notification (yellow, auto-dismiss 4s)
     */
    warning: (message: string, description?: string) => {
        toast.warning(message, {
            description,
            duration: 4000,
        });
    },

    /**
     * Loading notification (persists until dismissed)
     */
    loading: (message: string) => {
        return toast.loading(message);
    },

    /**
     * Promise-based toast (loading → success/error)
     */
    promise: <T,>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: Error) => string);
        }
    ) => {
        return toast.promise(promise, messages);
    },

    /**
     * Dismiss a specific toast or all toasts
     */
    dismiss: (toastId?: string | number) => {
        toast.dismiss(toastId);
    },
};

/**
 * Action feedback helpers
 */
export const ActionToast = {
    created: (entityName: string) => {
        ToastService.success(`${entityName} created successfully`);
    },

    updated: (entityName: string) => {
        ToastService.success(`${entityName} updated successfully`);
    },

    deleted: (entityName: string) => {
        ToastService.success(`${entityName} deleted successfully`);
    },

    sent: (entityName: string) => {
        ToastService.success(`${entityName} sent`);
    },

    copied: () => {
        ToastService.success('Copied to clipboard');
    },

    saved: () => {
        ToastService.success('Changes saved');
    },
};

export default ToastService;
