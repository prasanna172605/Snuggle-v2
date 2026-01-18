import React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarWithStatusProps {
    src: string;
    alt: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    status?: 'online' | 'offline' | 'inCall' | 'away';
    className?: string;
}

const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
};

const statusIndicatorSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
};

const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    inCall: 'bg-blue-500',
    away: 'bg-yellow-500',
};

export const AvatarWithStatus: React.FC<AvatarWithStatusProps> = ({
    src,
    alt,
    size = 'md',
    status,
    className,
}) => {
    return (
        <div className={cn('relative inline-block', className)}>
            <img
                src={src}
                alt={alt}
                className={cn(
                    'rounded-full object-cover border-2 border-white dark:border-gray-800',
                    sizeClasses[size]
                )}
            />

            {status && (
                <span
                    className={cn(
                        'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-gray-800',
                        statusIndicatorSizes[size],
                        statusColors[status]
                    )}
                    aria-label={`Status: ${status}`}
                />
            )}
        </div>
    );
};

export default AvatarWithStatus;
