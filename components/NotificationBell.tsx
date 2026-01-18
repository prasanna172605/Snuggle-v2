import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../types/notification';
import {
    subscribeToNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '../services/notificationService';
import { auth } from '../services/firebase';

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showPanel, setShowPanel] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement>(null);

    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Subscribe to notifications
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = subscribeToNotifications(user.uid, (notifs) => {
            setNotifications(notifs);
        });

        return () => unsubscribe();
    }, []);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setShowPanel(false);
            }
        };

        if (showPanel) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPanel]);

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        // Navigate if route provided
        if (notification.data?.route) {
            navigate(notification.data.route);
            setShowPanel(false);
        }
    };

    const handleMarkAllRead = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            await markAllAsRead(user.uid);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        try {
            await deleteNotification(notificationId);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'like':
                return '❤️';
            case 'comment':
                return '💬';
            case 'follow':
                return '👤';
            case 'message':
                return '📩';
            default:
                return '🔔';
        }
    };

    const getTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Icon with Badge */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
                <Bell className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {showPanel && (
                <div className="absolute right-0 mt-2 w-96 max-w-screen bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 max-h-[600px] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={loading}
                                className="text-sm text-snuggle-600 hover:text-snuggle-700 font-semibold flex items-center gap-1"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Bell className="w-12 h-12 mb-2" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors ${!notification.isRead ? 'bg-snuggle-50 dark:bg-snuggle-950' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div className="text-2xl flex-shrink-0">
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                {notification.title}
                                            </p>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                                {notification.message}
                                            </p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                {getTimeAgo(notification.createdAt)}
                                            </p>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => handleDelete(e, notification.id)}
                                            className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                        >
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>

                                        {/* Unread Indicator */}
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 bg-snuggle-500 rounded-full flex-shrink-0 mt-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
