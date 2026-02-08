import React, { useState, useEffect, useRef } from 'react';
import { User, Post, Comment as AppComment } from '../types';
import { DBService } from '../services/database';
import { X, Send, Heart, Trash2, Loader2, MessageCircle } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';
import { toast } from 'sonner';

interface CommentsSheetProps {
    post: Post;
    currentUser: User;
    onClose: () => void;
    onCommentAdded: () => void;
}

const CommentsSheet: React.FC<CommentsSheetProps> = ({ post, currentUser, onClose, onCommentAdded }) => {
    const [comments, setComments] = useState<AppComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [users, setUsers] = useState<Record<string, User>>({});
    const sheetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadComments();
        // Prevent body scroll when open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [post.id]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const cmts = await DBService.getComments(post.id);
            setComments(cmts);

            // Fetch user details for comments
            const userIds = new Set(cmts.map(c => c.userId));
            if (userIds.size > 0) {
                const fetchedUsers = await DBService.getUsersByIds(Array.from(userIds));
                const userMap: Record<string, User> = {};
                fetchedUsers.forEach(u => userMap[u.id] = u);
                setUsers(userMap);
            }
        } catch (e) {
            console.error('Error loading comments:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await DBService.addComment({
                postId: post.id,
                userId: currentUser.id,
                text: newComment.trim(),
                username: currentUser.username || 'user'
            });
            setNewComment('');
            await loadComments();
            onCommentAdded();
            toast.success('Comment added');
        } catch (e) {
            toast.error('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;
        try {
            await DBService.deleteComment(commentId, post.id);
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success('Comment deleted');
            onCommentAdded(); // Update count
        } catch (e) {
            toast.error('Failed to delete comment');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-t-[2rem] shadow-2xl flex flex-col max-h-[85vh] transition-transform duration-300 transform translate-y-0"
                style={{ height: '80vh' }}
            >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="text-center w-full">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white">
                            {comments.length} comments
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                            <p>No comments yet. Say something nice!</p>
                        </div>
                    ) : (
                        comments.map(comment => {
                            const user = users[comment.userId];
                            const isOwner = comment.userId === currentUser.id;

                            return (
                                <div key={comment.id} className="flex gap-3 group">
                                    <div className="flex-shrink-0">
                                        {user?.avatar ? (
                                            <img src={user.avatar} alt={user.username} className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">
                                                    {user?.username || comment.username} &bull; {formatRelativeTime(comment.createdAt)}
                                                </span>
                                                <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words">
                                                    {comment.text}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-center gap-1 pl-2">
                                                <button className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <Heart className="w-4 h-4" />
                                                </button>
                                                <span className="text-[10px] text-gray-400">0</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mt-2">
                                            <button className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                Reply
                                            </button>
                                            {isOwner && (
                                                <button
                                                    onClick={() => handleDelete(comment.id)}
                                                    className="text-xs font-semibold text-red-400 hover:text-red-500 flex items-center gap-1"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-white dark:bg-[#1a1a1a] pb-8">
                    <div className="flex items-center gap-3 bg-gray-100 dark:bg-[#2a2a2a] rounded-full px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-amber-400/50">
                        <img
                            src={currentUser.avatar || 'https://via.placeholder.com/150'}
                            className="w-7 h-7 rounded-full object-cover"
                            alt="You"
                        />
                        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={`Add comment as ${currentUser.username}...`}
                                className="flex-1 bg-transparent border-none text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || submitting}
                                className="ml-2 p-2 bg-amber-400 text-white rounded-full disabled:opacity-50 disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-all hover:scale-105"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 fill-current" />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentsSheet;
