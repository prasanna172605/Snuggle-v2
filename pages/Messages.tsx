
import React, { useState, useEffect } from 'react';
import { User, Message, Chat } from '../types';
import { DBService } from '../services/database';
import { Search, Edit, Users, Loader2, ChevronRight, UserPlus, X } from 'lucide-react';
import { SkeletonList, SkeletonCard } from '../components/common/Skeleton';

interface MessagesProps {
    currentUser: User;
    onChatSelect: (user: User) => void;
    onUserClick: (userId: string) => void;
}

const Messages: React.FC<MessagesProps> = ({ currentUser, onChatSelect, onUserClick }) => {
    const [chatUsers, setChatUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastMessages, setLastMessages] = useState<Record<string, Message | null>>({});

    // State for deleting chats
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [chatToDelete, setChatToDelete] = useState<User | null>(null);

    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);

    useEffect(() => {
        if (!currentUser?.id) {
            setLoading(false);
            return;
        }

        // Real-time subscription for inbox
        const unsubscribe = DBService.subscribeToUserChats(currentUser.id, (chats: Chat[]) => {
            const users: User[] = [];
            const msgs: Record<string, Message | null> = {};

            if (chats && chats.length > 0) {
                chats.forEach(chat => {
                    if (chat.otherUser) {
                        const unreadMap = chat.unreadCounts || {};
                        const unreadCount = unreadMap[currentUser.id] || 0;

                        users.push({
                            ...chat.otherUser,
                            unreadCount
                        } as User & { unreadCount?: number });

                        msgs[chat.otherUser.id] = {
                            id: 'latest',
                            text: chat.lastMessage,
                            timestamp: chat.lastMessageTimeValue || Date.now(),
                            senderId: chat.lastSenderId,
                            status: 'sent',
                            receiverId: currentUser.id,
                            type: 'text'
                        } as Message;
                    }
                });
            }

            setChatUsers(users);
            setLastMessages(msgs);
            setLoading(false);
        });

        const handleStorageChange = (e: StorageEvent | Event) => {
            // Re-fetch if needed, but subscription handles most cases
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            unsubscribe();
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [currentUser]);

    // Handle Search Logic
    useEffect(() => {
        const runSearch = async () => {
            if (!searchTerm.trim()) {
                setSearchResults([]);
                return;
            }

            try {
                // Determine search strategy: username or fuzzy?
                // For now, client-side filtering of recent/all users is expensive if many users.
                // Assuming DBService has a search method or we fetch all (as done previously).
                // Ideally: DBService.searchUsers(searchTerm)
                const allUsers = await DBService.getUsers(); // Warning: Scale issue
                const filtered = allUsers.filter(u =>
                    u.id !== currentUser.id &&
                    (u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.fullName && u.fullName.toLowerCase().includes(searchTerm.toLowerCase())))
                );
                setSearchResults(filtered);
            } catch (error) {
                console.error("Search failed", error);
            }
        };

        const debounce = setTimeout(runSearch, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, currentUser.id]);

    const handleSearchResultClick = (user: User) => {
        const isFriend = chatUsers.some(u => u.id === user.id);
        if (isFriend) {
            onChatSelect(user);
        } else {
            onUserClick(user.id);
        }
        setIsSearchOpen(false); // Close search after selection
        setSearchTerm('');
    };

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
        if (isSearchOpen) {
            setSearchTerm(''); // Clear on close
        }
    };

    const handleTouchStart = (user: User) => {
        const timer = setTimeout(() => {
            setChatToDelete(user);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
        setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleDeleteChat = async () => {
        if (!chatToDelete) return;

        try {
            const userId = chatToDelete.id;
            // Optimistic update
            setChatUsers(prev => prev.filter(u => u.id !== userId));

            const chatId = DBService.getChatId(currentUser.id, userId);
            await DBService.deleteChat(chatId);
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Failed to delete chat');
            // Consider reloading data here if optimistic update failed
        } finally {
            setChatToDelete(null);
        }
    };

    // ...

    if (loading) return <div className="p-4 pt-20"><SkeletonList count={5} itemComponent={() => (
        <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-[20px] bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
        </div>
    )} /></div>;

    return (
        <div className="pb-24 pt-2 px-2 relative min-h-screen">
            {/* Delete Confirmation Modal */}
            {chatToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-dark-card w-[85%] max-w-sm rounded-[32px] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
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
                                    className="flex-1 py-3.5 rounded-2xl font-bold bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
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
                    </div>
                </div>
            )}

            {/* Header Block */}
            <div className="px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Chats</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleSearch}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm border border-white/50 dark:border-white/10 ${isSearchOpen ? 'bg-red-50 text-red-500' : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-gray-800 dark:text-gray-200'}`}
                    >
                        {isSearchOpen ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
                    </button>
                    <button className="w-12 h-12 rounded-full flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-sm border border-white/50 dark:border-white/10 text-gray-800 dark:text-gray-200">
                        <Edit className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Stories / Online Row */}
            <div className="px-4 mb-6 overflow-x-auto no-scrollbar">
                <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-16 h-16 rounded-full bg-white/50 dark:bg-white/10 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <span className="text-2xl">+</span>
                        </div>
                        <span className="text-xs font-medium text-gray-500">Your Story</span>
                    </div>
                    {chatUsers.map(user => (
                        <div key={'story-' + user.id} className="flex flex-col items-center gap-1 shrink-0">
                            <div className={`p-[3px] rounded-full ${user.isOnline ? 'bg-gradient-to-tr from-amber-400 to-fuchsia-600' : 'bg-transparent border-2 border-transparent'}`}>
                                <img src={user.avatar} className="w-16 h-16 rounded-full border-2 border-white dark:border-black object-cover" />
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 max-w-[64px] truncate">{user.username}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Search Input Area - Conditionally Rendered */}
            {isSearchOpen && (
                <div className="bg-white dark:bg-dark-card rounded-bento p-2 mb-2 shadow-sm border border-transparent dark:border-dark-border transition-colors animate-in slide-in-from-top-2">
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Find people to chat with..."
                            autoFocus
                            className="w-full bg-gray-50 dark:bg-black rounded-[24px] pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:bg-gray-100 dark:focus:bg-dark-border dark:text-white transition-colors"
                        />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="px-2 pb-24 space-y-2">
                {isSearchOpen && searchTerm ? (
                    // --- SEARCH RESULTS VIEW ---
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-[2rem] p-4 shadow-sm">
                        {searchResults.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <p className="text-gray-400 text-sm">No users found matching "{searchTerm}"</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Search Results</h3>
                                {/* ... existing search mapping ... */}
                                {searchResults.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleSearchResultClick(user)}
                                        className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar} className="w-12 h-12 rounded-xl object-cover" />
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
                    chatUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-[2.5rem]">
                            <div className="bg-white/80 dark:bg-slate-700/80 p-6 rounded-full mb-4 shadow-sm">
                                <Users className="w-12 h-12 text-gray-300 dark:text-gray-500" />
                            </div>
                            <h3 className="text-gray-900 dark:text-white font-bold mb-2">No Messages Yet</h3>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto">Tap the search button above to find friends!</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {chatUsers.map(user => {
                                const lastMsg = lastMessages[user.id];
                                const unreadCount = (user as any).unreadCount || 0;
                                const timeString = lastMsg
                                    ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '';
                                const isUnread = unreadCount > 0;

                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => onChatSelect(user)}
                                        onContextMenu={(e) => { e.preventDefault(); setChatToDelete(user); }}
                                        className={`group flex items-center p-4 hover:bg-white/60 dark:hover:bg-slate-800/60 active:scale-[0.98] rounded-[2rem] cursor-pointer transition-all duration-200 relative ${isUnread ? 'bg-white/80 dark:bg-slate-800/80 shadow-sm border border-white/50' : 'bg-transparent'}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img src={user.avatar} alt={user.username} className="w-16 h-16 rounded-[1.2rem] object-cover shadow-sm bg-gray-100 dark:bg-gray-800" />
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
                                                    : (lastMsg
                                                        ? (lastMsg.senderId === currentUser.id ? `You: ${lastMsg.text}` : lastMsg.text)
                                                        : <span className="text-gray-400 opacity-60">Start chatting...</span>)
                                                }
                                            </p>
                                        </div>

                                        {isUnread && (
                                            <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0 ml-2 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
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
