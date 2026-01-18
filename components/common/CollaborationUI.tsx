import React from 'react';
import { PresenceData } from '@/services/collaborationService';
import { cn } from '@/lib/utils';

interface OnlineUsersListProps {
    users: PresenceData[];
    maxDisplay?: number;
    className?: string;
}

/**
 * Display list of online users with avatars
 */
export function OnlineUsersList({ users, maxDisplay = 5, className }: OnlineUsersListProps) {
    const displayedUsers = users.slice(0, maxDisplay);
    const remainingCount = users.length - maxDisplay;

    if (users.length === 0) return null;

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className="flex -space-x-2">
                {displayedUsers.map(user => (
                    <div
                        key={user.userId}
                        className="relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 overflow-hidden bg-gray-200"
                        title={user.username}
                    >
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-cyan-500 text-white text-xs font-medium">
                                {user.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                    </div>
                ))}
            </div>

            {remainingCount > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    +{remainingCount}
                </span>
            )}

            <span className="text-sm text-gray-600 dark:text-gray-400">
                {users.length} online
            </span>
        </div>
    );
}

interface TypingIndicatorProps {
    usernames: string[];
    className?: string;
}

/**
 * Typing indicator with animated dots
 */
export function TypingIndicator({ usernames, className }: TypingIndicatorProps) {
    if (usernames.length === 0) return null;

    const displayText = usernames.length === 1
        ? `${usernames[0]} is typing`
        : usernames.length === 2
            ? `${usernames[0]} and ${usernames[1]} are typing`
            : `${usernames[0]} and ${usernames.length - 1} others are typing`;

    return (
        <div className={cn('flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400', className)}>
            <span>{displayText}</span>
            <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
        </div>
    );
}

interface OnlineStatusBadgeProps {
    isOnline: boolean;
    lastActive?: number;
    className?: string;
}

/**
 * Online status badge with last active time
 */
export function OnlineStatusBadge({ isOnline, lastActive, className }: OnlineStatusBadgeProps) {
    const getLastActiveText = () => {
        if (!lastActive) return '';

        const diff = Date.now() - lastActive;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className={cn(
                'w-2 h-2 rounded-full',
                isOnline ? 'bg-green-500' : 'bg-gray-400'
            )} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
                {isOnline ? 'Online' : lastActive ? getLastActiveText() : 'Offline'}
            </span>
        </div>
    );
}

export default {
    OnlineUsersList,
    TypingIndicator,
    OnlineStatusBadge,
};
