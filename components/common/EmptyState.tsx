import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
    className,
}) => {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center gap-4 p-8 text-center',
            className
        )}>
            {Icon && (
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
            )}

            <div className="space-y-2 max-w-sm">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {title}
                </h3>
                {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {description}
                    </p>
                )}
            </div>

            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
