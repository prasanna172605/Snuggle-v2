import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div
            className={cn(
                'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
                className
            )}
        />
    );
};

// Skeleton variants for common UI patterns

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 3,
    className,
}) => {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        'h-4',
                        i === lines - 1 ? 'w-2/3' : i % 2 === 0 ? 'w-full' : 'w-5/6'
                    )}
                />
            ))}
        </div>
    );
};

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
    size = 'md',
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    };

    return <Skeleton className={cn('rounded-full', sizeClasses[size])} />;
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={cn('p-4 space-y-3 bg-white dark:bg-gray-800 rounded-lg', className)}>
            <div className="flex items-center gap-3">
                <SkeletonAvatar />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                </div>
            </div>
            <SkeletonText lines={2} />
            <Skeleton className="h-48 w-full rounded-lg" />
        </div>
    );
};

export const SkeletonPost: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <SkeletonAvatar size="md" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>

            {/* Content */}
            <SkeletonText lines={3} />

            {/* Image */}
            <Skeleton className="h-64 w-full rounded-lg" />

            {/* Actions */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
            </div>
        </div>
    );
};

export const SkeletonList: React.FC<{ count?: number; itemComponent?: React.FC }> = ({
    count = 3,
    itemComponent: ItemComponent = SkeletonCard,
}) => {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <ItemComponent key={i} />
            ))}
        </div>
    );
};

export const SkeletonChat: React.FC = () => {
    return (
        <div className="space-y-3">
            {/* Incoming message */}
            <div className="flex items-start gap-2">
                <SkeletonAvatar size="sm" />
                <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>

            {/* Outgoing message */}
            <div className="flex items-start gap-2 justify-end">
                <Skeleton className="h-12 w-40 rounded-2xl" />
            </div>

            {/* Incoming message */}
            <div className="flex items-start gap-2">
                <SkeletonAvatar size="sm" />
                <Skeleton className="h-16 w-56 rounded-2xl" />
            </div>
        </div>
    );
};

export const SkeletonProfile: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-4">
                <SkeletonAvatar size="lg" />
                <div className="text-center space-y-2">
                    <Skeleton className="h-6 w-32 mx-auto" />
                    <Skeleton className="h-4 w-48 mx-auto" />
                </div>
            </div>

            {/* Stats */}
            <div className="flex justify-around">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="text-center space-y-1">
                        <Skeleton className="h-6 w-12 mx-auto" />
                        <Skeleton className="h-4 w-16 mx-auto" />
                    </div>
                ))}
            </div>

            {/* Bio */}
            <SkeletonText lines={2} />

            {/* Action buttons */}
            <div className="flex gap-2">
                <Skeleton className="h-10 flex-1 rounded-lg" />
                <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
        </div>
    );
};

export default Skeleton;
