import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
    label,
    error,
    helperText,
    className,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = Boolean(error);

    return (
        <div className="space-y-1">
            {label && (
                <label
                    htmlFor={props.id}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <input
                className={cn(
                    'w-full px-3 py-2 rounded-lg border transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-offset-0',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    hasError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900'
                        : 'border-gray-300 dark:border-gray-600 focus:border-cyan-500 focus:ring-cyan-200 dark:focus:ring-cyan-900',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                    className
                )}
                onFocus={(e) => {
                    setIsFocused(true);
                    props.onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    props.onBlur?.(e);
                }}
                {...props}
            />

            {(error || helperText) && (
                <p
                    className={cn(
                        'text-sm',
                        hasError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                    )}
                >
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default FormInput;
