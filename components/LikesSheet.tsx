import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { DBService } from '../services/database';
import { X, Search, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LikesSheetProps {
    post: Post;
    currentUser: User;
    onClose: () => void;
    onUserClick: (userId: string) => void;
}

const LikesSheet: React.FC<LikesSheetProps> = ({ post, currentUser, onClose, onUserClick }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set(currentUser.following || []));
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadLikes();
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [post.id]);

    const loadLikes = async () => {
        setLoading(true);
        try {
            // Check if post.likes is array of strings (user IDs)
            let userIds: string[] = [];

            if (Array.isArray(post.likes)) {
                userIds = post.likes as string[];
            } else if (post.likedBy) {
                userIds = post.likedBy;
            } else {
                // If likeCount is number but no IDs, we might need a fetch method in DBService
                // But generally for this app, we expect IDs to be available or fetchable
                // For now, if no IDs, we can't show much.
                // Assuming DBService might have getLikes(postId) - but we didn't find it.
                // We will rely on post.likedBy being populated or passed.
                // If empty, try fetching interactions?
                // Minimal fallback:
                userIds = [];
            }

            if (userIds.length > 0) {
                const fetchedUsers = await DBService.getUsersByIds(userIds);
                setUsers(fetchedUsers);
            }
        } catch (e) {
            console.error('Error loading likes:', e);
            toast.error('Failed to load likes');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (targetUserId: string) => {
        // Optimistic update
        const isFollowing = followingIds.has(targetUserId);

        setFollowingIds(prev => {
            const newSet = new Set(prev);
            if (isFollowing) newSet.delete(targetUserId);
            else newSet.add(targetUserId);
            return newSet;
        });

        try {
            if (isFollowing) {
                await DBService.unfollowUser(currentUser.id, targetUserId);
            } else {
                await DBService.followUser(currentUser.id, targetUserId);
            }
        } catch (e) {
            // Revert
            setFollowingIds(prev => {
                const newSet = new Set(prev);
                if (isFollowing) newSet.add(targetUserId);
                else newSet.delete(targetUserId);
                return newSet;
            });
            toast.error('Failed to update follow status');
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-t-[2rem] shadow-2xl flex flex-col max-h-[85vh] transition-transform duration-300"
                style={{ height: '70vh' }}
            >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="text-center w-full">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white">
                            Likes
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search"
                            className="w-full bg-gray-100 dark:bg-[#2a2a2a] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:text-white"
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                            <p>No likes found.</p>
                        </div>
                    ) : (
                        filteredUsers.map(user => {
                            const isMe = user.id === currentUser.id;
                            const isFollowing = followingIds.has(user.id);

                            return (
                                <div key={user.id} className="flex items-center justify-between">
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => {
                                            onClose();
                                            onUserClick(user.id);
                                        }}
                                    >
                                        <img
                                            src={user.avatar || 'https://via.placeholder.com/150'}
                                            alt={user.username}
                                            className="w-11 h-11 rounded-full object-cover border border-gray-100 dark:border-gray-700"
                                        />
                                        <div>
                                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-none mb-1">
                                                {user.fullName || user.username}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </div>

                                    {!isMe && (
                                        <button
                                            onClick={() => handleFollow(user.id)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${isFollowing
                                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                                                    : 'bg-amber-400 text-white hover:bg-amber-500 shadow-sm shadow-amber-400/20'
                                                }`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default LikesSheet;
