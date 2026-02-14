
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { DBService } from '../services/database';
import { 
    X, Search, Link as LinkIcon, Send, Copy, Share2, 
    MoreHorizontal, Check, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareSheetProps {
    isOpen: boolean;
    onClose: () => void;
    content: {
        id: string;
        type: 'memory' | 'post';
        title?: string;
        imageUrl?: string;
    };
    currentUser: User;
}

const ShareSheet: React.FC<ShareSheetProps> = ({ isOpen, onClose, content, currentUser }) => {
    const [recentChats, setRecentChats] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sendingTo, setSendingTo] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadRecentChats();
        }
    }, [isOpen]);

    const loadRecentChats = async () => {
        setLoading(true);
        try {
            // Use currentUser.following to get suggested users
            // In a real app, we might also query recent chats
            const followingIds = currentUser.following || [];
            
            if (followingIds.length === 0) {
                setRecentChats([]);
                return;
            }

            // Fetch users
            const users = await Promise.all(
                followingIds.slice(0, 12).map(id => DBService.getUserById(id))
            );
            
            setRecentChats(users.filter(u => u !== null) as User[]);
        } catch (error) {
            console.error("Failed to load suggested shares", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (user: User) => {
        setSendingTo(user.id);
        try {
            // Create a message with the memory link
            const text = `Check this out: /memory/${content.id}`; 
            // Note: The app chat automatically handles /memory/:id links now due to our previous refactor
            
            // 1. Get or create chat
            const chatId = await DBService.createChat(currentUser.id, user.id);
            
            // 2. Send message
            await DBService.sendMessage({
                id: crypto.randomUUID(),
                senderId: currentUser.id,
                receiverId: user.id,
                text: text,
                type: 'text',
                timestamp: Date.now(),
                read: false,
                status: 'sent',
                post: { id: content.id, caption: content.title, imageUrl: content.imageUrl }
            });
            
            toast.success(`Sent to ${user.username}`);
            // Don't close immediately, allow multiple sends
            // But reset loading state
            setTimeout(() => setSendingTo(null), 1000);
        } catch (error) {
            toast.error("Failed to send");
            setSendingTo(null);
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/memory/${content.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied");
        onClose();
    };

    const handleSystemShare = async () => {
        const url = `${window.location.origin}/memory/${content.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Snuggle Memory',
                    text: content.title || 'Check out this memory on Snuggle',
                    url: url
                });
                onClose();
            } catch (err) {
                // User cancelled or failed
            }
        } else {
            handleCopyLink();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="bg-gray-900 border border-white/10 w-full max-w-md sm:rounded-[32px] rounded-t-[32px] p-6 pointer-events-auto transform transition-transform animate-in slide-in-from-bottom duration-300">
                
                {/* Handle for mobile */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold text-lg">Share</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                    />
                </div>

                {/* Recent Chats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {loading ? (
                         Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div className="w-14 h-14 rounded-full bg-white/5 animate-pulse" />
                                <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
                            </div>
                         ))
                    ) : recentChats.slice(0, 8).map(user => (
                        <button 
                            key={user.id} 
                            className="flex flex-col items-center gap-2 group"
                            onClick={() => handleSend(user)}
                            disabled={sendingTo === user.id}
                        >
                            <div className="relative">
                                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-snuggle-400 to-snuggle-600 group-hover:scale-105 transition-transform">
                                    <img 
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`} 
                                        className="w-full h-full rounded-full object-cover border-2 border-gray-900" 
                                    />
                                </div>
                                {sendingTo === user.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                        <Check className="w-6 h-6 text-green-500" />
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-gray-300 font-medium truncate w-full text-center">
                                {user.username}
                            </span>
                        </button>
                    ))}
                    {recentChats.length === 0 && !loading && (
                        <div className="col-span-4 text-center py-4 text-gray-500 text-sm">
                            Follow people to share with them quickly!
                        </div>
                    )}
                </div>

                {/* System Actions Row */}
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
                    <button 
                         onClick={handleCopyLink}
                         className="flex flex-col items-center gap-2 min-w-[70px]"
                    >
                         <div className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5">
                            <LinkIcon className="w-5 h-5 text-white" />
                         </div>
                         <span className="text-xs text-gray-400 font-medium">Copy link</span>
                    </button>

                    <button 
                         onClick={handleSystemShare}
                         className="flex flex-col items-center gap-2 min-w-[70px]"
                    >
                         <div className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5">
                            <Share2 className="w-5 h-5 text-white" />
                         </div>
                         <span className="text-xs text-gray-400 font-medium">Share via...</span>
                    </button>
                    
                    {/* Add more external apps here like WhatsApp/Instagram if using deep links */}
                     <button 
                         onClick={() => {
                             window.open(`https://wa.me/?text=${encodeURIComponent(`${window.location.origin}/memory/${content.id}`)}`, '_blank');
                         }}
                         className="flex flex-col items-center gap-2 min-w-[70px]"
                    >
                         <div className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5">
                            <Send className="w-5 h-5 text-white" />
                         </div>
                         <span className="text-xs text-gray-400 font-medium">WhatsApp</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareSheet;
