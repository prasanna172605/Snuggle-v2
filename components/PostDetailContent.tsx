import React, { useState, useEffect } from 'react';
import { User, Post, Comment as AppComment } from '../types';
import { DBService } from '../services/database';
import {
    MoreHorizontal, Heart, MessageCircle, Send, Bookmark,
    Trash2, Loader2
} from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';
import { toast } from 'sonner';

interface PostDetailContentProps {
    post: Post;
    user: User;
    currentUser: User;
    isOwner: boolean;
    onPostUpdated?: () => void;
    onPostDeleted?: () => void;
    // Optional callbacks that might be used by the parent
    onClose?: () => void;
}

const PostDetailContent: React.FC<PostDetailContentProps> = ({
    post,
    user,
    currentUser,
    isOwner,
    onPostUpdated,
    onPostDeleted,
    onClose
}) => {
    const [comments, setComments] = useState<AppComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editCaption, setEditCaption] = useState(post.caption);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    useEffect(() => {
        loadComments();

        // Check like/save status
        const likesArray = Array.isArray(post.likes) ? post.likes : [];
        setIsLiked(likesArray.includes(currentUser.id));
        setLikeCount(likesArray.length);
        setIsSaved(currentUser.savedPosts?.includes(post.id) || false);
    }, [post.id, currentUser.id]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const cmts = await DBService.getComments(post.id);
            setComments(cmts);
        } catch (e) {
            console.error('Error loading comments:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        try {
            if (isLiked) {
                await DBService.unlikePost(post.id, currentUser.id);
                setIsLiked(false);
                setLikeCount(prev => prev - 1);
            } else {
                await DBService.likePost(post.id, currentUser.id);
                setIsLiked(true);
                setLikeCount(prev => prev + 1);
            }
        } catch (e) {
            toast.error('Failed to update like');
        }
    };

    const handleSave = async () => {
        try {
            if (isSaved) {
                await DBService.unsavePost(post.id, currentUser.id);
                setIsSaved(false);
                toast.success('Removed from saved');
            } else {
                await DBService.savePost(post.id, currentUser.id);
                setIsSaved(true);
                toast.success('Post saved!');
            }
        } catch (e) {
            toast.error('Failed to update save');
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
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
            toast.success('Comment added!');
        } catch (e) {
            toast.error('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async () => {
        try {
            await DBService.updatePost(post.id, { caption: editCaption });
            toast.success('Post updated!');
            setShowEditModal(false);
            onPostUpdated?.();
        } catch (e) {
            toast.error('Failed to update post');
        }
    };

    const handleDelete = async () => {
        try {
            await DBService.softDeletePost(post.id, currentUser.id);
            toast.success('Post moved to Recently Deleted');
            setShowDeleteConfirm(false);
            onPostDeleted?.();
            if (onClose) onClose();
        } catch (e) {
            toast.error('Failed to delete post');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;
        try {
            await DBService.deleteComment(commentId, post.id);
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success('Comment deleted');
        } catch (e) {
            toast.error('Failed to delete comment');
        }
    };

    return (
        <div className="bg-white dark:bg-dark-surface w-full h-full flex flex-col md:flex-row rounded-lg overflow-hidden shadow-2xl relative">
            {/* Left Side - Media */}
            <div className="md:w-[60%] bg-black flex items-center justify-center relative min-h-[300px] md:min-h-full">
                {post.mediaType === 'video' ? (
                    <video
                        src={post.imageUrl}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                    />
                ) : (
                    <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full h-full object-contain"
                    />
                )}
            </div>

            {/* Right Side - Details */}
            <div className="md:w-[40%] flex flex-col h-full max-h-[60vh] md:max-h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                    <div className="flex items-center gap-3">
                        <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{user.username}</span>
                    </div>
                    <button
                        onClick={() => setShowOptionsMenu(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </div>

                {/* Comments Section */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Caption */}
                    <div className="flex gap-3">
                        <img src={user.avatar} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                        <div>
                            <p className="text-sm">
                                <span className="font-bold text-gray-900 dark:text-white mr-2">{user.username}</span>
                                <span className="text-gray-700 dark:text-gray-300">{post.caption}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(post.createdAt)}</p>
                        </div>
                    </div>

                    {/* Comments */}
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {comment.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm">
                                        <span className="font-bold text-gray-900 dark:text-white mr-2">{comment.username}</span>
                                        <span className="text-gray-700 dark:text-gray-300">{comment.text}</span>
                                    </p>
                                    <div className="flex gap-4 mt-1">
                                        <span className="text-xs text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                                        <button className="text-xs text-gray-400 font-semibold hover:text-gray-600">Reply</button>
                                        {(comment.userId === currentUser.id || isOwner) && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-xs text-red-400 font-semibold hover:text-red-600"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button className="p-1 hover:text-red-500">
                                    <Heart className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Actions */}
                <div className="border-t border-gray-200 dark:border-dark-border p-4 bg-white dark:bg-dark-surface">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                            <button onClick={handleLike} className="hover:opacity-70 transition-opacity">
                                <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                            </button>
                            <button className="hover:opacity-70 transition-opacity">
                                <MessageCircle className="w-6 h-6" />
                            </button>
                            <button className="hover:opacity-70 transition-opacity">
                                <Send className="w-6 h-6" />
                            </button>
                        </div>
                        <button onClick={handleSave} className="hover:opacity-70 transition-opacity">
                            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                    </div>

                    {/* Like count */}
                    <p className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                        {likeCount} likes
                    </p>
                    <p className="text-xs text-gray-400 mb-3">{formatRelativeTime(post.createdAt)}</p>

                    {/* Comment Input */}
                    <form onSubmit={handleCommentSubmit} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || submitting}
                            className="text-accent font-bold text-sm disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Options Menu Modal */}
            {showOptionsMenu && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setShowOptionsMenu(false)}>
                    <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="divide-y divide-gray-200 dark:divide-dark-border">
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => { setShowDeleteConfirm(true); setShowOptionsMenu(false); }}
                                        className="w-full py-4 text-center text-red-500 font-bold hover:bg-gray-50 dark:hover:bg-dark-hover"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => { setShowEditModal(true); setShowOptionsMenu(false); }}
                                        className="w-full py-4 text-center text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-dark-hover"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { toast.info('Feature coming soon'); setShowOptionsMenu(false); }}
                                        className="w-full py-4 text-center text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-dark-hover"
                                    >
                                        Hide like count to others
                                    </button>
                                    <button
                                        onClick={() => { toast.info('Feature coming soon'); setShowOptionsMenu(false); }}
                                        className="w-full py-4 text-center text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-dark-hover"
                                    >
                                        Turn off commenting
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => { window.open(`/post/${post.id}`, '_blank'); setShowOptionsMenu(false); }}
                                className="w-full py-4 text-center text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-dark-hover"
                            >
                                Go to post
                            </button>
                            <button
                                onClick={() => { toast.info('About this account'); setShowOptionsMenu(false); }}
                                className="w-full py-4 text-center text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-dark-hover"
                            >
                                About this account
                            </button>
                            <button
                                onClick={() => setShowOptionsMenu(false)}
                                className="w-full py-4 text-center text-gray-500 font-medium hover:bg-gray-50 dark:hover:bg-dark-hover"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                            <button onClick={() => setShowEditModal(false)} className="text-gray-500 font-medium">Cancel</button>
                            <h3 className="font-bold text-lg">Edit info</h3>
                            <button onClick={handleEdit} className="text-accent font-bold">Done</button>
                        </div>
                        <div className="p-4">
                            <textarea
                                value={editCaption}
                                onChange={(e) => setEditCaption(e.target.value)}
                                className="w-full h-32 bg-gray-100 dark:bg-dark-bg rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                                placeholder="Write a caption..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-sm mx-4 overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Delete post?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                This post will be moved to Recently Deleted. You can restore it within 30 days.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-dark-bg rounded-xl font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostDetailContent;
