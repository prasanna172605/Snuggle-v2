import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    text?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    className,
    text,
}) => {
    return (
        <div className="flex flex-col items-center justify-center gap-2">
            <Loader2
                className={cn(
                    'animate-spin text-cyan-500',
                    sizeClasses[size],
                    className
                )}
            />
            {text && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
            )}
        </div>
    );
};

export default LoadingSpinner;
