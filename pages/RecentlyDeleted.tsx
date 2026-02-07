import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { DBService } from '../services/database';
import { ArrowLeft, Trash2, RotateCcw, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RecentlyDeletedProps {
    currentUser: User;
    onBack: () => void;
}

const RecentlyDeleted: React.FC<RecentlyDeletedProps> = ({ currentUser, onBack }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadDeletedPosts();
    }, [currentUser.id]);

    const loadDeletedPosts = async () => {
        setLoading(true);
        try {
            const deleted = await DBService.getDeletedPosts(currentUser.id);
            setPosts(deleted);
        } catch (e) {
            console.error('Error loading deleted posts:', e);
            toast.error('Failed to load deleted posts');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (postId: string) => {
        setActionLoading(postId);
        try {
            await DBService.restorePost(postId, currentUser.id);
            toast.success('Post restored!');
            await loadDeletedPosts();
        } catch (e) {
            toast.error('Failed to restore post');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePermanentDelete = async (postId: string) => {
        if (!confirm('This will permanently delete this post. This action cannot be undone.')) {
            return;
        }

        setActionLoading(postId);
        try {
            await DBService.permanentlyDeletePost(postId, currentUser.id);
            toast.success('Post permanently deleted');
            await loadDeletedPosts();
        } catch (e) {
            toast.error('Failed to delete post');
        } finally {
            setActionLoading(null);
        }
    };

    const getDaysRemaining = (deletedAt: any): number => {
        if (!deletedAt) return 30;
        const deleted = deletedAt.toDate ? deletedAt.toDate() : new Date(deletedAt);
        const expiresAt = new Date(deleted);
        expiresAt.setDate(expiresAt.getDate() + 30);
        const now = new Date();
        const diff = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    };

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Recently Deleted</h1>
                </div>
            </div>

            {/* Info Banner */}
            <div className="mx-4 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Items are automatically deleted after 30 days
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Restore items to keep them, or delete now to remove permanently.
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-16">
                        <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Deleted Items</h2>
                        <p className="text-sm text-gray-500">
                            Items you delete will appear here for 30 days before being permanently removed.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {posts.map(post => {
                            const daysLeft = getDaysRemaining(post.deletedAt);
                            const isUrgent = daysLeft <= 7;

                            return (
                                <div key={post.id} className="relative group">
                                    {/* Post Image */}
                                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-surface">
                                        {post.mediaType === 'video' ? (
                                            <video src={post.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                                        )}

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {actionLoading === post.id ? (
                                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                                            ) : (
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleRestore(post.id)}
                                                        className="p-3 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw className="w-5 h-5 text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePermanentDelete(post.id)}
                                                        className="p-3 bg-red-500/80 hover:bg-red-500 rounded-full"
                                                        title="Delete Forever"
                                                    >
                                                        <Trash2 className="w-5 h-5 text-white" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Days Remaining Badge */}
                                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isUrgent
                                            ? 'bg-red-500 text-white'
                                            : 'bg-black/60 text-white backdrop-blur-sm'
                                        }`}>
                                        <Clock className="w-3 h-3" />
                                        {daysLeft}d
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentlyDeleted;
