
import React, { useState, useEffect } from 'react';
import { User, Post, Story, Comment as AppComment } from '../types';
import { DBService } from '../services/database';
import { Heart, MessageSquare, Send, MoreHorizontal, Loader2, Play, Bookmark, X, Trash2, Edit3, Copy, Flag } from 'lucide-react';
import StoryViewer from '../components/StoryViewer';
import { SkeletonPost, SkeletonAvatar } from '../components/common/Skeleton';
import { formatRelativeTime } from '../utils/dateUtils';
import { toast } from 'sonner';

interface FeedProps {
    currentUser: User;
    onUserClick?: (userId: string) => void;
}

// Comments Modal Component
const CommentsModal: React.FC<{
    post: Post;
    user: User;
    currentUser: User;
    onClose: () => void;
    onCommentAdded: () => void;
}> = ({ post, user, currentUser, onClose, onCommentAdded }) => {
    const [comments, setComments] = useState<AppComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, [post.id]);

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
            toast.success('Comment added!');
        } catch (e) {
            toast.error('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg bg-white dark:bg-dark-surface rounded-t-3xl sm:rounded-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Comments</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No comments yet. Be the first!</p>
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
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatRelativeTime(comment.createdAt)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-dark-border flex gap-3">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-gray-100 dark:bg-dark-bg border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || submitting}
                        className="bg-accent text-white px-4 py-2 rounded-full font-medium text-sm disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Post Options Menu Component
const PostOptionsMenu: React.FC<{
    post: Post;
    isOwner: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
}> = ({ post, isOwner, onEdit, onDelete, onClose }) => {
    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        toast.success('Link copied!');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full sm:max-w-sm bg-white dark:bg-dark-surface rounded-t-3xl sm:rounded-2xl overflow-hidden">
                <div className="py-2">
                    {isOwner && (
                        <>
                            <button
                                onClick={() => { onEdit(); onClose(); }}
                                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-dark-hover"
                            >
                                <Edit3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                <span className="text-gray-900 dark:text-white font-medium">Edit Post</span>
                            </button>
                            <button
                                onClick={() => { onDelete(); onClose(); }}
                                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-dark-hover"
                            >
                                <Trash2 className="w-5 h-5 text-red-500" />
                                <span className="text-red-500 font-medium">Delete Post</span>
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleCopyLink}
                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-dark-hover"
                    >
                        <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white font-medium">Copy Link</span>
                    </button>
                    {!isOwner && (
                        <button
                            onClick={() => { toast.info('Report submitted'); onClose(); }}
                            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-dark-hover"
                        >
                            <Flag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-gray-900 dark:text-white font-medium">Report</span>
                        </button>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="w-full py-4 border-t border-gray-200 dark:border-dark-border font-bold text-gray-500"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

// Edit Post Modal
const EditPostModal: React.FC<{
    post: Post;
    onSave: (caption: string) => void;
    onClose: () => void;
}> = ({ post, onSave, onClose }) => {
    const [caption, setCaption] = useState(post.caption);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(caption);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-dark-surface rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                    <button onClick={onClose} className="text-gray-500 font-medium">Cancel</button>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Edit Post</h3>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-accent font-bold disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Done'}
                    </button>
                </div>
                <div className="p-4">
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full h-32 bg-gray-100 dark:bg-dark-bg rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                        placeholder="Write a caption..."
                    />
                </div>
            </div>
        </div>
    );
};

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
    onConfirm: () => void;
    onClose: () => void;
}> = ({ onConfirm, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-dark-surface rounded-2xl overflow-hidden text-center">
                <div className="p-6">
                    <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Delete Post?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        This post will be moved to Recently Deleted. You can restore it within 30 days.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 dark:bg-dark-bg rounded-xl font-medium text-gray-700 dark:text-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StoriesBento: React.FC<{
    onUserClick?: (id: string) => void;
    onStoryClick: (userId: string) => void;
    storyUsers: User[];
    storiesByUser: Record<string, Story[]>;
    currentUser: User;
}> = ({ onUserClick, onStoryClick, storyUsers, storiesByUser, currentUser }) => {

    return (
        <div className="bg-white dark:bg-dark-card rounded-b-bento rounded-t-bento-sm shadow-sm p-4 mb-4 mx-2 mt-2 transition-colors border border-transparent dark:border-dark-border">
            <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2">
                {/* Create Story */}
                <div className="flex flex-col items-center space-y-1 min-w-[72px]">
                    <div className="w-[72px] h-[72px] rounded-[24px] border-2 border-dashed border-accent/40 dark:border-accent/30 p-1 flex items-center justify-center cursor-pointer hover:bg-accent/5 dark:hover:bg-accent/10 transition-colors">
                        <div className="w-full h-full rounded-[18px] bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                            <span className="text-2xl text-accent">+</span>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Add Story</span>
                </div>

                {storyUsers.map(user => {
                    const userStories = storiesByUser[user.id] || [];
                    const allViewed = userStories.every(s => s.views && s.views.includes(currentUser.id));

                    return (
                        <div key={user.id} className="flex flex-col items-center space-y-1 min-w-[72px]" onClick={() => onStoryClick(user.id)}>
                            <div className={`w-[72px] h-[72px] rounded-[24px] p-[2px] cursor-pointer transition-all ${allViewed ? 'bg-gray-300 dark:bg-gray-600' : 'bg-warm'}`}>
                                <div className="w-full h-full rounded-[22px] bg-white dark:bg-dark-card p-[2px]">
                                    <img src={user.avatar} className="w-full h-full rounded-[20px] object-cover" alt={user.username} />
                                </div>
                            </div>
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-300 truncate w-16 text-center">{user.username}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Feed: React.FC<FeedProps> = ({ currentUser, onUserClick }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [users, setUsers] = useState<Record<string, User>>({});
    const [loading, setLoading] = useState(true);

    // Stories State
    const [allStories, setAllStories] = useState<Story[]>([]);
    const [storyUsers, setStoryUsers] = useState<User[]>([]);
    const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null);

    // Modal State
    const [commentsPost, setCommentsPost] = useState<Post | null>(null);
    const [menuPost, setMenuPost] = useState<Post | null>(null);
    const [editPost, setEditPost] = useState<Post | null>(null);
    const [deletePost, setDeletePost] = useState<Post | null>(null);

    useEffect(() => {
        const loadFeed = async () => {
            setLoading(true);
            try {
                // Use getFeed to fetch posts from followed users + self
                const feedPosts = await DBService.getFeed(currentUser.id, 50);
                // Filter out deleted posts
                const activePosts = feedPosts.filter(p => !p.isDeleted);
                setPosts(activePosts);

                // Fetch users for posts
                const uIds = new Set(activePosts.map(p => p.userId));
                const allUsers = await DBService.getUsers();
                const newUsers: Record<string, User> = {};
                allUsers.forEach(u => {
                    if (uIds.has(u.id)) {
                        newUsers[u.id] = u;
                    }
                });
                setUsers(newUsers);

                // Load Stories
                const s = await DBService.getStories();
                setAllStories(s);

                const userIdsWithStories = Array.from(new Set(s.map(story => story.userId)));
                const sUsers = allUsers.filter(u => userIdsWithStories.includes(u.id));
                setStoryUsers(sUsers);
            } catch (e) {
                console.error("Error loading feed:", e);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.id) {
            loadFeed();
        }
    }, [currentUser]);

    const refreshPosts = async () => {
        const updatedPosts = await DBService.getFeed(currentUser.id, 50);
        const activePosts = updatedPosts.filter(p => !p.isDeleted);
        setPosts(activePosts);
    };

    const handleLike = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        const likesArray = Array.isArray(post?.likes) ? post.likes : [];
        const isLiked = likesArray.includes(currentUser.id);

        if (isLiked) {
            await DBService.unlikePost(postId, currentUser.id);
        } else {
            await DBService.likePost(postId, currentUser.id);
        }
        await refreshPosts();
    };

    const handleSave = async (postId: string) => {
        const isSaved = currentUser.savedPosts?.includes(postId);

        if (isSaved) {
            await DBService.unsavePost(postId, currentUser.id);
            toast.success('Removed from saved');
        } else {
            await DBService.savePost(postId, currentUser.id);
            toast.success('Post saved!');
        }
    };

    const handleShare = async (postId: string) => {
        // TODO: Open share modal to select users
        toast.info('Share to chat coming soon!');
    };

    const handleComment = (post: Post) => {
        setCommentsPost(post);
    };

    const handleEditSave = async (caption: string) => {
        if (!editPost) return;
        try {
            await DBService.updatePost(editPost.id, { caption });
            toast.success('Post updated!');
            setEditPost(null);
            await refreshPosts();
        } catch (e) {
            toast.error('Failed to update post');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletePost) return;
        try {
            await DBService.softDeletePost(deletePost.id, currentUser.id);
            toast.success('Post moved to Recently Deleted');
            setDeletePost(null);
            await refreshPosts();
        } catch (e) {
            toast.error('Failed to delete post');
        }
    };

    const handleStoryClick = (userId: string) => {
        setViewingStoryUserId(userId);
    };

    const handleNextUserStory = () => {
        if (!viewingStoryUserId) return;
        const currentIndex = storyUsers.findIndex(u => u.id === viewingStoryUserId);
        if (currentIndex !== -1 && currentIndex < storyUsers.length - 1) {
            setViewingStoryUserId(storyUsers[currentIndex + 1].id);
        } else {
            setViewingStoryUserId(null); // Close if no more users
        }
    };

    const handlePrevUserStory = () => {
        if (!viewingStoryUserId) return;
        const currentIndex = storyUsers.findIndex(u => u.id === viewingStoryUserId);
        if (currentIndex > 0) {
            setViewingStoryUserId(storyUsers[currentIndex - 1].id);
        }
    };

    // Group stories by User ID
    const storiesByUser = allStories.reduce((acc, story) => {
        if (!acc[story.userId]) acc[story.userId] = [];
        acc[story.userId].push(story);
        return acc;
    }, {} as Record<string, Story[]>);


    if (loading) {
        return (
            <div className="pb-20 pt-0 px-2 space-y-4">
                {/* Stories Skeleton */}
                <div className="bg-white dark:bg-dark-card rounded-b-bento rounded-t-bento-sm shadow-sm p-4 mb-4 mt-2 border border-transparent dark:border-dark-border flex items-center gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex flex-col items-center space-y-2 min-w-[72px]">
                            <SkeletonAvatar size="lg" />
                            <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Posts Skeleton */}
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white dark:bg-dark-card rounded-bento p-4 shadow-sm">
                        <SkeletonPost />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="pb-20 pt-0">
            {/* Modals */}
            {commentsPost && users[commentsPost.userId] && (
                <CommentsModal
                    post={commentsPost}
                    user={users[commentsPost.userId]}
                    currentUser={currentUser}
                    onClose={() => setCommentsPost(null)}
                    onCommentAdded={refreshPosts}
                />
            )}

            {menuPost && (
                <PostOptionsMenu
                    post={menuPost}
                    isOwner={menuPost.userId === currentUser.id}
                    onEdit={() => setEditPost(menuPost)}
                    onDelete={() => setDeletePost(menuPost)}
                    onClose={() => setMenuPost(null)}
                />
            )}

            {editPost && (
                <EditPostModal
                    post={editPost}
                    onSave={handleEditSave}
                    onClose={() => setEditPost(null)}
                />
            )}

            {deletePost && (
                <DeleteConfirmModal
                    onConfirm={handleDeleteConfirm}
                    onClose={() => setDeletePost(null)}
                />
            )}

            {viewingStoryUserId && users[viewingStoryUserId] && storiesByUser[viewingStoryUserId] && (
                <StoryViewer
                    stories={storiesByUser[viewingStoryUserId]}
                    user={users[viewingStoryUserId]}
                    onClose={() => setViewingStoryUserId(null)}
                    onNextUser={handleNextUserStory}
                    onPrevUser={handlePrevUserStory}
                />
            )}

            <StoriesBento
                onUserClick={onUserClick}
                onStoryClick={handleStoryClick}
                storyUsers={storyUsers}
                storiesByUser={storiesByUser}
                currentUser={currentUser}
            />
            {/* Posts - Centered for Desktop */}
            <div className="space-y-4 px-2 max-w-xl mx-auto">
                {posts.map(post => {
                    const user = users[post.userId];
                    if (!user) return null;

                    return (
                        <div key={post.id} className="bg-white dark:bg-dark-card rounded-bento shadow-sm transition-colors border border-transparent dark:border-dark-border overflow-hidden pb-3 mb-4">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 pt-3 pb-3">
                                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onUserClick?.(user.id)}>
                                    <div className="relative">
                                        <img src={user.avatar} className="w-8 h-8 rounded-full object-cover border border-gray-100 dark:border-gray-800" alt="" />
                                        {/* Optional story ring could go here */}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-none">{user.username}</h3>
                                        <p className="text-[10px] text-gray-400 font-medium">{formatRelativeTime(post.createdAt)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMenuPost(post)}
                                    className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content (Full Bleed) */}
                            <div className="w-full bg-gray-100 dark:bg-black relative aspect-square sm:aspect-auto">
                                {post.mediaType === 'video' ? (
                                    <div className="relative w-full h-full">
                                        <video src={post.imageUrl} className="w-full h-full object-cover max-h-[600px]" controls />
                                    </div>
                                ) : (
                                    <img src={post.imageUrl} className="w-full h-full object-cover max-h-[600px]" alt="Post" />
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between px-3 pt-3">
                                <div className="flex items-center gap-4">
                                    {(() => {
                                        const likesArray = Array.isArray(post.likes) ? post.likes : [];
                                        const isLiked = likesArray.includes(currentUser.id);
                                        return (
                                            <button onClick={() => handleLike(post.id)} className="group flex items-center gap-1.5 focus:outline-none">
                                                <Heart className={`w-6 h-6 transition-transform active:scale-90 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-900 dark:text-white stroke-[1.5px]'}`} />
                                            </button>
                                        );
                                    })()}

                                    <button onClick={() => handleComment(post)} className="group flex items-center gap-1.5 focus:outline-none">
                                        <MessageSquare className="w-6 h-6 text-gray-900 dark:text-white stroke-[1.5px]" />
                                    </button>

                                    <button onClick={() => handleShare(post.id)} className="group focus:outline-none">
                                        <Send className="w-6 h-6 text-gray-900 dark:text-white stroke-[1.5px] -mt-1" />
                                    </button>
                                </div>

                                {/* Save/Bookmark */}
                                {(() => {
                                    const isSaved = currentUser.savedPosts?.includes(post.id);
                                    return (
                                        <button onClick={() => handleSave(post.id)} className="group focus:outline-none">
                                            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-white text-white dark:fill-white dark:text-white' : 'text-gray-900 dark:text-white stroke-[1.5px]'}`} />
                                        </button>
                                    );
                                })()}
                            </div>

                            {/* Likes Text */}
                            <div className="px-4 py-1">
                                <p className="font-bold text-sm text-gray-900 dark:text-white">
                                    {Array.isArray(post.likes) ? post.likes.length : post.likes} likes
                                </p>
                            </div>

                            {/* Caption */}
                            <div className="px-4 pb-2">
                                <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed">
                                    <span className="font-bold mr-2 text-gray-900 dark:text-white">{user.username}</span>
                                    {post.caption}
                                </p>
                                {post.comments > 0 && (
                                    <button
                                        onClick={() => handleComment(post)}
                                        className="text-gray-400 text-sm mt-1 font-medium hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        View all {post.comments} comments
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {posts.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                        <p>No posts yet. Follow some people!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Feed;
