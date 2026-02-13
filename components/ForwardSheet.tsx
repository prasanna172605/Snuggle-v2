import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, Loader2 } from 'lucide-react';
import { User, Message } from '../types';
import { DBService } from '../services/database';
import { toast } from 'sonner';

interface ForwardSheetProps {
    isOpen: boolean;
    onClose: () => void;
    message: Message | null;
    currentUser: User;
}

const ForwardSheet: React.FC<ForwardSheetProps> = ({ isOpen, onClose, message, currentUser }) => {
    const [chats, setChats] = useState<{ user: User; chatId: string }[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [forwarding, setForwarding] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadChats();
        }
    }, [isOpen]);

    const loadChats = async () => {
        setLoading(true);
        try {
            const userChats = await DBService.getUserChats(currentUser.id);
            const chatUsers = userChats
                .filter(c => c.otherUser)
                .map(c => ({
                    user: c.otherUser!,
                    chatId: c.id
                }));
            setChats(chatUsers);
        } catch (e) {
            console.error('Error loading chats for forward:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleForward = async (targetUser: User) => {
        if (!message) return;
        setForwarding(targetUser.id);
        try {
            // Create a new message in the target chat
            const forwardedMessage: Message = {
                id: Date.now().toString(),
                senderId: currentUser.id,
                receiverId: targetUser.id,
                text: message.text,
                timestamp: Date.now(),
                status: 'sent',
                type: message.type,
                fileUrl: message.fileUrl,
                thumbnailUrl: message.thumbnailUrl,
                fileName: message.fileName,
                fileSize: message.fileSize,
                mediaDuration: message.mediaDuration,
                read: false,
            };
            await DBService.sendMessage(forwardedMessage);
            toast.success(`Forwarded to ${targetUser.fullName || targetUser.username}`);
            onClose();
        } catch (err) {
            console.error('Forward failed:', err);
            toast.error('Failed to forward message');
        } finally {
            setForwarding(null);
        }
    };

    const filteredChats = chats.filter(c =>
        (c.user.fullName || c.user.username || '')
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[80] bg-black/60 flex items-end justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="w-full max-w-lg bg-white dark:bg-dark-surface rounded-t-3xl overflow-hidden max-h-[70vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                            <h3 className="font-bold text-lg text-black dark:text-white">Forward to</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-4 py-3">
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-bg rounded-full px-4 py-2.5">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="flex-1 bg-transparent text-sm focus:outline-none text-black dark:text-white placeholder-gray-400"
                                />
                            </div>
                        </div>

                        {/* Chat List */}
                        <div className="flex-1 overflow-y-auto px-2 pb-4">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                                </div>
                            ) : filteredChats.length === 0 ? (
                                <p className="text-center text-gray-400 py-8 text-sm">No chats found</p>
                            ) : (
                                filteredChats.map(({ user }) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleForward(user)}
                                        disabled={forwarding === user.id}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-hover rounded-xl transition-colors"
                                    >
                                        <img
                                            src={user.avatar || user.photoURL || '/default-avatar.png'}
                                            alt=""
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="font-semibold text-sm text-black dark:text-white truncate">
                                                {user.fullName || user.username}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                                        </div>
                                        {forwarding === user.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-accent" />
                                        ) : (
                                            <Send className="w-5 h-5 text-accent" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ForwardSheet;
