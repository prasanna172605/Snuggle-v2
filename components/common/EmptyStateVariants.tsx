import React from 'react';
import {
    Inbox,
    Search,
    Filter,
    MessageSquare,
    Bell,
    Users,
    Image,
    Heart,
    LucideIcon
} from 'lucide-react';
import { EmptyState } from './EmptyState';

// Pre-configured empty state variants for common scenarios

export const NoPostsYet: React.FC<{ onCreatePost?: () => void }> = ({ onCreatePost }) => {
    return (
        <EmptyState
            icon={Image}
            title="No posts yet"
            description="Share your first moment with your friends"
            action={onCreatePost ? {
                label: 'Create Post',
                onClick: onCreatePost
            } : undefined}
        />
    );
};

export const NoSearchResults: React.FC<{ onClearSearch?: () => void }> = ({ onClearSearch }) => {
    return (
        <EmptyState
            icon={Search}
            title="No results found"
            description="Try different keywords or remove filters"
            action={onClearSearch ? {
                label: 'Clear Search',
                onClick: onClearSearch
            } : undefined}
        />
    );
};

export const NoNotifications: React.FC = () => {
    return (
        <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="We'll notify you when something new happens"
        />
    );
};

export const NoMessages: React.FC<{ onStartChat?: () => void }> = ({ onStartChat }) => {
    return (
        <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Start a conversation with your friends"
            action={onStartChat ? {
                label: 'Start Chat',
                onClick: onStartChat
            } : undefined}
        />
    );
};

export const NoFollowers: React.FC<{ onFindFriends?: () => void }> = ({ onFindFriends }) => {
    return (
        <EmptyState
            icon={Users}
            title="No followers yet"
            description="Share your profile to grow your community"
            action={onFindFriends ? {
                label: 'Find Friends',
                onClick: onFindFriends
            } : undefined}
        />
    );
};

export const NoFilteredResults: React.FC<{ onClearFilters: () => void }> = ({ onClearFilters }) => {
    return (
        <EmptyState
            icon={Filter}
            title="No matching items"
            description="Try adjusting or clearing your filters"
            action={{
                label: 'Clear Filters',
                onClick: onClearFilters
            }}
        />
    );
};

export const NoActivity: React.FC = () => {
    return (
        <EmptyState
            icon={Heart}
            title="No recent activity"
            description="Your activity will appear here"
        />
    );
};

export const EmptyInbox: React.FC = () => {
    return (
        <EmptyState
            icon={Inbox}
            title="Inbox is empty"
            description="All your messages will appear here"
        />
    );
};
