import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { EmptyState } from './EmptyState';
import { LucideIcon } from 'lucide-react';

/**
 * StateResolver - Handles the Loading → Error → Empty → Data resolution order
 * 
 * Usage:
 * <StateResolver
 *   loading={isLoading}
 *   error={error}
 *   empty={data.length === 0}
 *   emptyProps={{ icon: Inbox, title: "No items", description: "..." }}
 *   onRetry={() => refetch()}
 * >
 *   {data.map(item => <Item key={item.id} {...item} />)}
 * </StateResolver>
 */

export interface StateResolverProps {
    loading: boolean;
    error?: Error | null;
    empty: boolean;
    children: React.ReactNode;

    // Loading customization
    loadingText?: string;
    loadingSkeleton?: React.ReactNode;

    // Error customization
    onRetry?: () => void;
    errorTitle?: string;

    // Empty state customization
    emptyProps: {
        icon?: LucideIcon;
        title: string;
        description?: string;
        action?: {
            label: string;
            onClick: () => void;
        };
    };
}

export const StateResolver: React.FC<StateResolverProps> = ({
    loading,
    error,
    empty,
    children,
    loadingText,
    loadingSkeleton,
    onRetry,
    errorTitle,
    emptyProps,
}) => {
    // Priority 1: Loading
    if (loading) {
        return loadingSkeleton || (
            <div className="flex items-center justify-center min-h-[200px]">
                <LoadingSpinner size="lg" text={loadingText} />
            </div>
        );
    }

    // Priority 2: Error
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <ErrorMessage
                    title={errorTitle || 'Error'}
                    message={error.message || 'Something went wrong'}
                    onRetry={onRetry}
                />
            </div>
        );
    }

    // Priority 3: Empty
    if (empty) {
        return <EmptyState {...emptyProps} />;
    }

    // Priority 4: Data
    return <>{children}</>;
};

export default StateResolver;
