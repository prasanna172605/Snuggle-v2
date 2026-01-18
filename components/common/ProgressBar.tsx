import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
    progress: number; // 0-100
    size?: 'sm' | 'md' | 'lg';
    showPercentage?: boolean;
    className?: string;
    color?: 'blue' | 'green' | 'cyan';
}

const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
};

const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    cyan: 'bg-cyan-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    size = 'md',
    showPercentage = false,
    className,
    color = 'cyan',
}) => {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
        <div className={cn('w-full', className)}>
            <div className={cn(
                'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
                sizeClasses[size]
            )}>
                <div
                    className={cn(
                        'h-full transition-all duration-300 ease-out',
                        colorClasses[color]
                    )}
                    style={{ width: `${clampedProgress}%` }}
                    role="progressbar"
                    aria-valuenow={clampedProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>

            {showPercentage && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                    {Math.round(clampedProgress)}%
                </div>
            )}
        </div>
    );
};

export const IndeterminateProgress: React.FC<{
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}> = ({ size = 'md', className }) => {
    return (
        <div className={cn('w-full', className)}>
            <div className={cn(
                'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
                sizeClasses[size]
            )}>
                <div className="h-full bg-cyan-500 animate-indeterminate" />
            </div>
        </div>
    );
};

export default ProgressBar;
