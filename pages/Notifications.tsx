
import React, { useEffect, useState, useRef } from 'react';
import { DBService } from '../services/database';
import { User, Notification } from '../types';
import { UserPlus, Heart, MessageCircle, Bell as BellIcon, UserCheck } from 'lucide-react';
import { SkeletonList } from '../components/common/Skeleton';

interface NotificationsProps {
    currentUser: User;
    onUserClick?: (userId: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ currentUser, onUserClick }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true); // Added loading state for Skeleton

    const [senders, setSenders] = useState<Record<string, User>>({});
    const sendersRef = useRef<Record<string, User>>({});

    useEffect(() => {
        if (!currentUser?.id) {
            console.log('[Notifications] No currentUser.id, skipping subscription');
            return;
        }

        const handleNotifsUpdate = async (notifs: Notification[]) => {
            setNotifications(notifs);
            setLoading(false); // Stop loading

            if (notifs.some(n => !n.read)) {
                DBService.markAllNotificationsRead();
            }

            const missingIds = new Set<string>();
            notifs.forEach(n => {
                if (n.senderId && !sendersRef.current[n.senderId]) {
                    missingIds.add(n.senderId);
                }
            });

            if (missingIds.size > 0) {
                const newSenders: Record<string, User> = {};
                await Promise.all(Array.from(missingIds).map(async (id) => {
                    const u = await DBService.getUserById(id);
                    if (u) {
                        newSenders[id] = u;
                        sendersRef.current[id] = u;
                    }
                }));
                setSenders(prev => ({ ...prev, ...newSenders }));
            }
        };

        const unsubscribe = DBService.subscribeToNotifications(currentUser.id, handleNotifsUpdate);
        return () => unsubscribe();
    }, [currentUser]);

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'follow': return <UserPlus className="w-4 h-4 text-white" />;
            case 'like': return <Heart className="w-4 h-4 text-white" />;
            case 'comment': return <MessageCircle className="w-4 h-4 text-white" />;
            default: return <UserPlus className="w-4 h-4 text-white" />;
        }
    };

    const getBgColor = (type: Notification['type']) => {
        switch (type) {
            case 'follow': return 'bg-snuggle-500';
            case 'like': return 'bg-red-500';
            case 'comment': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

    return (
        <div className="bg-white dark:bg-black min-h-screen">
            <div className="px-4 py-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
                <button
                    onClick={async () => {
                        if (!currentUser?.id) return;
                        if (!confirm('Clear all notifications?')) return;
                        try {
                            await DBService.deleteAllNotifications(currentUser.id);
                            setNotifications([]);
                        } catch (err) {
                            console.error('Failed to clear notifications:', err);
                            alert('Failed to clear notifications');
                        }
                    }}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                    Clear All
                </button>
            </div>

            <div className="px-6 py-6">


                {/* Regular Notifications */}
                {loading ? (
                    <div className="pt-4">
                        <SkeletonList count={6} itemComponent={() => (
                            <div className="flex items-start px-4 py-4 gap-3 animate-pulse">
                                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="w-3/4 h-3 bg-gray-200 rounded" />
                                    <div className="w-1/4 h-2 bg-gray-200 rounded" />
                                </div>
                            </div>
                        )} />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
                        <BellIcon className="w-12 h-12 mb-2 opacity-20" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-dark-border">
                        {notifications.map(notif => {
                            // Handle missing sender (deleted user)
                            const sender = notif.senderId && senders[notif.senderId] ? senders[notif.senderId] : {
                                id: 'deleted',
                                username: 'Snuggle User',
                                avatar: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y', // Default placeholder
                                fullName: 'Unknown User'
                            } as User;

                            if (!notif.senderId && notif.type !== 'system') return null;

                            return (
                                <div
                                    key={notif.id}
                                    onClick={() => notif.senderId && sender.id !== 'deleted' && onUserClick?.(notif.senderId)}
                                    className={`flex items-start px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                >
                                    <div className="relative">
                                        <img src={sender.avatar} alt={sender.username} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800" />
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-black ${getBgColor(notif.type)}`}>
                                            {getIcon(notif.type)}
                                        </div>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm text-gray-800 dark:text-gray-200">
                                            {notif.text || notif.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">{formatTime(notif.createdAt?.toMillis ? notif.createdAt.toMillis() : (notif.createdAt || Date.now()))}</p>
                                    </div>
                                    {notif.type === 'follow' && (
                                        <div className="bg-gray-100 dark:bg-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300">
                                            Follower
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
