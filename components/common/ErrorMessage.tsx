import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    title = 'Error',
    message,
    onRetry,
    className,
}) => {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center gap-3 p-6 text-center',
            className
        )}>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
            </div>

            <div className="space-y-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                    {title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {message}
                </p>
            </div>

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </button>
            )}
        </div>
    );
};

export default ErrorMessage;
