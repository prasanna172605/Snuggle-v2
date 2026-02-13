import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Chat, Message } from '../types';
import { DBService } from '../services/database';
import { Search, Edit3, MoreVertical, X, Check, Users, ChevronRight } from 'lucide-react';
import { SkeletonList } from '../components/common/Skeleton';
import { AnimatePresence, motion } from 'framer-motion';

interface MessagesProps {
    currentUser: User;
    onChatSelect: (user: User) => void;
    onUserClick: (userId: string) => void;
}

const Messages: React.FC<MessagesProps> = ({ currentUser, onChatSelect, onUserClick }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchResults, setSearchResults] = useState<User[]>([]);

    // State for deleting chats
    const [chatToDelete, setChatToDelete] = useState<User | null>(null);

    const navigate = useNavigate();

    // Subscribe to chats
    useEffect(() => {
        if (!currentUser?.id) return;

        const unsubscribe = DBService.subscribeToUserChats(currentUser.id, (updatedChats: Chat[]) => {
            setChats(updatedChats);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser?.id]);

    // Search Logic
    useEffect(() => {
        const runSearch = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            try {
                const allUsers = await DBService.getUsers();
                const filtered = allUsers.filter(u =>
                    u.id !== currentUser.id &&
                    (u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase())))
                );
                setSearchResults(filtered);
            } catch (error) {
                console.error("Search failed", error);
            }
        };

        const debounce = setTimeout(runSearch, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, currentUser.id]);


    const handleDeleteChat = async () => {
        if (!chatToDelete) return;

        try {
            const userId = chatToDelete.id;
            // Optimistic update
            setChats(prev => prev.filter(c => c.otherUser?.id !== userId));

            const chatId = DBService.getChatId(currentUser.id, userId);
            await DBService.deleteChat(chatId);
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Failed to delete chat');
        } finally {
            setChatToDelete(null);
        }
    };

    const handleSearchResultClick = (user: User) => {
        const existingChat = chats.find(c => c.otherUser?.id === user.id);
        if (existingChat && existingChat.otherUser) {
            onChatSelect(existingChat.otherUser);
        } else {
            onUserClick(user.id);
        }
        setShowSearch(false);
        setSearchQuery('');
    };

    if (loading) return (
        <div className="p-4 pt-20">
            <SkeletonList count={5} itemComponent={() => (
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-[20px] bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                </div>
            )} />
        </div>
    );

    return (
        <div className="pb-24 pt-2 px-2 relative min-h-screen">
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {chatToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-zinc-900 w-[85%] max-w-sm rounded-[32px] p-6 shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500">
                                    <Users className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Clear Chat?</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                    Are you sure you want to delete your conversation with <span className="font-bold text-gray-900 dark:text-white">{chatToDelete.fullName}</span>? This cannot be undone.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setChatToDelete(null)}
                                        className="flex-1 py-3.5 rounded-2xl font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteChat}
                                        className="flex-1 py-3.5 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
                <h1 className="text-3xl font-black text-snuggle-600 dark:text-snuggle-400">Messages</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`p-2 rounded-full transition-all ${isEditMode ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                    >
                        {isEditMode ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-2 rounded-full transition-all ${showSearch ? 'bg-blue-50 text-blue-500' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                    >
                        {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </button>
                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-2"
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-gray-900 dark:text-white placeholder-gray-500"
                                autoFocus
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            <div className="px-2 pb-24 space-y-2">
                {showSearch && searchQuery ? (
                    // --- SEARCH RESULTS VIEW ---
                    <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-[2rem] p-4 shadow-sm border border-white/20 dark:border-white/5">
                        {searchResults.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <p className="text-gray-400 text-sm">No users found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Search Results</h3>
                                {searchResults.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleSearchResultClick(user)}
                                        className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar} className="w-12 h-12 rounded-xl object-cover" alt={user.username} />
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{user.username}</p>
                                                <p className="text-xs text-gray-500">{user.fullName}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-300" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // --- EXISTING CHATS VIEW ---
                    chats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-[2.5rem] border border-white/20 dark:border-white/5">
                            <div className="bg-white/80 dark:bg-zinc-700/80 p-6 rounded-full mb-4 shadow-sm">
                                <Users className="w-12 h-12 text-gray-300 dark:text-gray-500" />
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-bold mb-2">No Messages Yet</h3>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto">Tap the search button above to find friends!</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {chats.map(chat => {
                                const user = chat.otherUser;
                                if (!user) return null;

                                const unreadMap = chat.unreadCounts || {};
                                const unreadCount = unreadMap[currentUser.id] || 0;
                                const isUnread = unreadCount > 0;

                                const lastMsgTime = chat.lastMessageTimeValue
                                    ? (typeof chat.lastMessageTimeValue === 'number'
                                        ? new Date(chat.lastMessageTimeValue)
                                        : (chat.lastMessageTimeValue as any).toDate
                                            ? (chat.lastMessageTimeValue as any).toDate()
                                            : new Date())
                                    : new Date();

                                const timeString = lastMsgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => onChatSelect(user)}
                                        onContextMenu={(e) => { e.preventDefault(); setChatToDelete(user); }}
                                        className={`group flex items-center p-4 hover:bg-white/60 dark:hover:bg-zinc-800/60 active:scale-[0.98] rounded-[2rem] cursor-pointer transition-all duration-200 relative ${isUnread ? 'bg-white/80 dark:bg-zinc-800/80 shadow-sm border border-white/50 dark:border-white/10' : 'bg-transparent'}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img src={user.avatar} alt={user.username} className="w-16 h-16 rounded-[1.2rem] object-cover shadow-sm bg-gray-100 dark:bg-zinc-800" />
                                            {user.isOnline && (
                                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-[3px] border-white dark:border-black rounded-full"></span>
                                            )}
                                        </div>

                                        <div className="ml-4 flex-1 overflow-hidden pr-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className={`text-[17px] truncate ${isUnread ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-900 dark:text-white'}`}>{user.fullName}</h3>
                                                <span className={`text-[12px] font-medium ${isUnread ? 'text-amber-500' : 'text-gray-400'}`}>{timeString}</span>
                                            </div>
                                            <p className={`text-[15px] truncate leading-tight ${isUnread ? 'font-bold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {isUnread && unreadCount > 1
                                                    ? <span className="text-amber-600 dark:text-amber-400">{unreadCount > 4 ? '4+' : unreadCount} new messages</span>
                                                    : (chat.lastMessage || <span className="text-gray-400 opacity-60">Start chatting...</span>)
                                                }
                                            </p>
                                        </div>

                                        {isUnread && (
                                            <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0 ml-2 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                                        )}

                                        {isEditMode && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setChatToDelete(user); }}
                                                className="absolute right-4 bg-red-100 text-red-500 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default Messages;
