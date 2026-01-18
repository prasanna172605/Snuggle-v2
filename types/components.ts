import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

// Common component prop types

export interface BaseComponentProps {
    className?: string;
    children?: ReactNode;
}

export interface LoadingState {
    isLoading: boolean;
    error?: Error | null;
}

export interface EmptyStateConfig {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export interface UserStatusType {
    online: boolean;
    inCall: boolean;
    lastSeen: number;
}

// Layout prop types

export interface LayoutProps extends BaseComponentProps {
    title?: string;
    showHeader?: boolean;
    showNav?: boolean;
}

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    backButton?: boolean;
    onBack?: () => void;
    actions?: ReactNode;
}

// Feature-specific types

export interface MediaPreviewProps {
    src: string;
    type: 'image' | 'video';
    alt?: string;
    onLoad?: () => void;
    onError?: () => void;
}

export interface InfiniteListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => ReactNode;
    onLoadMore: () => void;
    hasMore: boolean;
    loading?: boolean;
    emptyState?: EmptyStateConfig;
}
