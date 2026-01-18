/**
 * Form validation helpers with inline error support
 */

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

export interface FormField {
    value: string | number | boolean;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
}

/**
 * Validate a single field
 */
export function validateField(
    fieldName: string,
    field: FormField
): string | null {
    const value = field.value;

    // Required check
    if (field.required && (!value || value === '')) {
        return `${fieldName} is required`;
    }

    // Skip other checks if empty and not required
    if (!value && !field.required) {
        return null;
    }

    // Min length check
    if (field.minLength && String(value).length < field.minLength) {
        return `${fieldName} must be at least ${field.minLength} characters`;
    }

    // Max length check
    if (field.maxLength && String(value).length > field.maxLength) {
        return `${fieldName} must be no more than ${field.maxLength} characters`;
    }

    // Pattern check
    if (field.pattern && !field.pattern.test(String(value))) {
        return `${fieldName} format is invalid`;
    }

    // Custom validation
    if (field.custom) {
        return field.custom(value);
    }

    return null;
}

/**
 * Validate multiple fields
 */
export function validateForm(
    fields: Record<string, FormField>
): ValidationResult {
    const errors: Record<string, string> = {};

    Object.entries(fields).forEach(([fieldName, field]) => {
        const error = validateField(fieldName, field);
        if (error) {
            errors[fieldName] = error;
        }
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    username: /^[a-zA-Z0-9_]{3,20}$/,
    url: /^https?:\/\/.+/,
    phone: /^\+?[\d\s-()]+$/,
};

/**
 * Common validators
 */
export const Validators = {
    email: (value: string): string | null => {
        if (!ValidationPatterns.email.test(value)) {
            return 'Please enter a valid email address';
        }
        return null;
    },

    username: (value: string): string | null => {
        if (!ValidationPatterns.username.test(value)) {
            return 'Username must be 3-20 characters (letters, numbers, underscores only)';
        }
        return null;
    },

    password: (value: string): string | null => {
        if (value.length < 6) {
            return 'Password must be at least 6 characters';
        }
        return null;
    },

    confirmPassword: (password: string, confirmPassword: string): string | null => {
        if (password !== confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    },

    url: (value: string): string | null => {
        if (!ValidationPatterns.url.test(value)) {
            return 'Please enter a valid URL';
        }
        return null;
    },
};

export default {
    validateField,
    validateForm,
    ValidationPatterns,
    Validators,
};
