import React, { useState, useEffect } from 'react';
import { User, Post, Chat } from '../types';
import { DBService } from '../services/database';
import { X, Search, Send, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SharePostModalProps {
    post: Post;
    currentUser: User;
    onClose: () => void;
}

const SharePostModal: React.FC<SharePostModalProps> = ({ post, currentUser, onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            // Get following and recent chats
            // For simplicity, just get all users or following. 
            // In a real app, we'd rank by recent interactions.
            const followingIds = currentUser.following || [];
            if (followingIds.length > 0) {
                const followingUsers = await DBService.getUsersByIds(followingIds);
                setUsers(followingUsers);
            } else {
                // Fallback: get some users
                const allUsers = await DBService.getUsers();
                setUsers(allUsers.filter(u => u.id !== currentUser.id));
            }
        } catch (e) {
            console.error('Failed to load users for share', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (selectedUserIds.size === 0) return;
        setSending(true);
        try {
            const promises = Array.from(selectedUserIds).map(async (userId) => {
                // Send message with post link/attachment
                const messageId = crypto.randomUUID(); // Browser native UUID

                await DBService.sendMessage({
                    id: messageId,
                    senderId: currentUser.id,
                    receiverId: userId,
                    text: `Check out this post: /post/${post.id}`,
                    type: 'text',
                    timestamp: Date.now(),
                    read: false,
                    status: 'sent'
                });
            });

            await Promise.all(promises);
            toast.success('Sent!');
            onClose();
        } catch (e) {
            console.error('Share failed', e);
            toast.error('Failed to send');
        } finally {
            setSending(false);
        }
    };

    const toggleUser = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUserIds(newSet);
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Share</h3>
                    <button onClick={onClose}>
                        <X className="w-6 h-6 text-gray-900 dark:text-white" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 dark:border-dark-border">
                    <div className="bg-gray-100 dark:bg-dark-bg rounded-xl flex items-center px-3 py-2">
                        <Search className="w-5 h-5 text-gray-400 mr-2" />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:outline-none w-full text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400">Loading...</div>
                    ) : filteredUsers.map(user => (
                        <div
                            key={user.id}
                            onClick={() => toggleUser(user.id)}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-hover rounded-xl cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">{user.username}</p>
                                    <p className="text-xs text-gray-500">{user.fullName}</p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedUserIds.has(user.id) ? 'bg-accent border-accent' : 'border-gray-300 dark:border-gray-600'}`}>
                                {selectedUserIds.has(user.id) && <Check className="w-4 h-4 text-white" />}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-dark-border">
                    <button
                        onClick={handleSend}
                        disabled={selectedUserIds.size === 0 || sending}
                        className="w-full bg-accent text-white font-bold py-3 rounded-xl disabled:opacity-50"
                    >
                        {sending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SharePostModal;
