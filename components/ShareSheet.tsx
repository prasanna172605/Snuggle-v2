
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
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadRecentChats();
            setSelectedUsers(new Set()); // Reset selection on open
        }
    }, [isOpen]);

    const loadRecentChats = async () => {
        setLoading(true);
        try {
            // Use currentUser.following to get suggested users
            const followingIds = currentUser.following || [];
            
            if (followingIds.length === 0) {
                setRecentChats([]);
                return;
            }

            // Fetch users
            const users = await DBService.getUsersByIds(followingIds.slice(0, 20)); // Limit to 20
            setRecentChats(users);
        } catch (error) {
            console.error("Failed to load suggested shares", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleSend = async () => {
        if (selectedUsers.size === 0) return;

        setSending(true);
        const userIds = Array.from(selectedUsers);
        let successCount = 0;

        try {
            const text = `Check this out: /memory/${content.id}`; 
            // Note: The app chat automatically handles /memory/:id links now due to our previous refactor
            
            await Promise.all(userIds.map(async (recipientId) => {
                try {
                     // 1. Get or create chat
                    const chatId = await DBService.createChat(currentUser.id, recipientId);
                    
                    // 2. Send message
                    await DBService.sendMessage({
                        id: crypto.randomUUID(),
                        senderId: currentUser.id,
                        receiverId: recipientId,
                        text: text,
                        type: 'text',
                        timestamp: Date.now(),
                        read: false,
                        status: 'sent',
                        post: { id: content.id, caption: content.title, imageUrl: content.imageUrl }
                    });
                    successCount++;
                } catch (e) {
                    console.error(`Failed to send to ${recipientId}`, e);
                }
            }));

            if (successCount > 0) {
                toast.success(`Sent to ${successCount} people`);
                onClose();
            } else {
                toast.error("Failed to send");
            }

        } catch (error) {
            console.error("Batch send failed", error);
            toast.error("An error occurred while sending");
        } finally {
            setSending(false);
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

    const filteredUsers = recentChats.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="bg-gray-900 border border-white/10 w-full max-w-md sm:rounded-[32px] rounded-t-[32px] p-6 pointer-events-auto transform transition-transform animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[80vh]">
                
                {/* Handle for mobile */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden flex-shrink-0" />

                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <h3 className="text-white font-bold text-lg">Share</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6 flex-shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search people" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                    />
                </div>

                {/* Users Grid */}
                <div className="overflow-y-auto mb-6 flex-1 min-h-[200px]">
                    <div className="grid grid-cols-4 gap-4">
                        {loading ? (
                             Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="w-14 h-14 rounded-full bg-white/5 animate-pulse" />
                                    <div className="w-12 h-3 bg-white/5 rounded animate-pulse" />
                                </div>
                             ))
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(user => {
                                const isSelected = selectedUsers.has(user.id);
                                return (
                                    <button 
                                        key={user.id} 
                                        className="flex flex-col items-center gap-2 group relative"
                                        onClick={() => toggleSelection(user.id)}
                                    >
                                        <div className="relative">
                                            <div className={`w-14 h-14 rounded-full p-[2px] transition-all ${isSelected ? 'bg-snuggle-500 scale-105' : 'bg-transparent group-hover:bg-white/10'}`}>
                                                <img 
                                                    src={user.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${user.username}`} 
                                                    className={`w-full h-full rounded-full object-cover border-2 ${isSelected ? 'border-transparent' : 'border-gray-800'}`} 
                                                />
                                            </div>
                                            {isSelected && (
                                                <div className="absolute bottom-0 right-0 bg-snuggle-500 rounded-full p-1 border-2 border-gray-900">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium truncate w-full text-center ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                            {user.username}
                                        </span>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="col-span-4 text-center py-8 text-gray-500 text-sm">
                                {searchTerm ? 'No users found matching search' : 'Follow people to see them here!'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col gap-4 flex-shrink-0 border-t border-white/5 pt-4">
                     {selectedUsers.size > 0 ? (
                        <button 
                            onClick={handleSend}
                            disabled={sending}
                            className="w-full py-3 bg-snuggle-500 hover:bg-snuggle-600 active:bg-snuggle-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {sending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Send to {selectedUsers.size} {selectedUsers.size === 1 ? 'person' : 'people'}
                                </>
                            )}
                        </button>
                     ) : (
                         /* System Actions Row (Only show when no selection) */
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
                     )}
                </div>
            </div>
        </div>
    );
};

export default ShareSheet;
