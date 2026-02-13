
import React, { useState, useEffect } from 'react';
import { User, Post, Story, Comment as AppComment } from '../types';
import { DBService } from '../services/database';
import { useInteractions } from '../context/InteractionContext';
import { Heart, MessageSquare, Send, MoreHorizontal, Loader2, Play, Bookmark, X, Trash2, Edit3, Copy, Flag, Star } from 'lucide-react';
import StoryViewer from '../components/StoryViewer';
import { SkeletonPost, SkeletonAvatar } from '../components/common/Skeleton';
import { formatRelativeTime } from '../utils/dateUtils';
import { toast } from 'sonner';
import SharePostModal from '../components/SharePostModal';
import { useNavigate } from 'react-router-dom';
import CommentsSheet from '../components/CommentsSheet';
import LikesSheet from '../components/LikesSheet';

interface FeedProps {
    currentUser: User;
    onUserClick?: (userId: string) => void;
}


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
                                <span className="text-black dark:text-white font-medium">Edit Post</span>
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
                        <span className="text-black dark:text-white font-medium">Copy Link</span>
                    </button>
                    {!isOwner && (
                        <button
                            onClick={() => { toast.info('Report submitted'); onClose(); }}
                            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-dark-hover"
                        >
                            <Flag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-black dark:text-white font-medium">Report</span>
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
                    <h3 className="font-bold text-lg text-black dark:text-white">Edit Post</h3>
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
                    <h3 className="font-bold text-lg text-black dark:text-white mb-2">Delete Post?</h3>
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

    const handleAddStory = (e: React.MouseEvent) => {
        e.stopPropagation();
        document.getElementById('story-file-input')?.click();
    };

    return (
        <div className="mb-6 mx-4 overflow-x-auto no-scrollbar pt-2">
            <div className="flex gap-4">
                {/* My Story (Combined Logic) */}
                <div className="flex flex-col items-center space-y-1 min-w-[72px] relative group" onClick={() => {
                    const myStories = storiesByUser[currentUser.id];
                    if (myStories && myStories.length > 0) {
                        onStoryClick(currentUser.id);
                    } else {
                        document.getElementById('story-file-input')?.click();
                    }
                }}>
                    <div className={`w-[72px] h-[72px] rounded-full p-[3px] cursor-pointer transition-all ${storiesByUser[currentUser.id]?.length ? 'bg-gradient-to-tr from-accent to-primary' : 'bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-600'}`}>
                        <div className="w-full h-full rounded-full p-[2px] relative overflow-hidden">
                            <img src={currentUser.avatar} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black" alt="Your Story" />

                            {/* Plus Icon */}
                            <div
                                onClick={handleAddStory}
                                className="absolute bottom-0 right-0 w-6 h-6 bg-accent rounded-full border-2 border-white dark:border-black flex items-center justify-center hover:bg-accent-dark transition-colors z-10"
                            >
                                <span className="text-white text-lg font-bold pb-0.5">+</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">Your Story</span>
                </div>

                {storyUsers
                    .filter(u => u.id !== currentUser.id)
                    .map(user => {
                        const userStories = storiesByUser[user.id] || [];
                        const allViewed = userStories.every(s => s.views && s.views.includes(currentUser.id));

                        return (
                            <div key={user.id} className="flex flex-col items-center space-y-1 min-w-[72px] group" onClick={() => onStoryClick(user.id)}>
                                <div className={`w-[72px] h-[72px] rounded-full p-[3px] cursor-pointer transition-transform group-hover:scale-105 ${allViewed ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gradient-to-tr from-accent to-primary'}`}>
                                    <div className="w-full h-full rounded-full p-[2px] bg-white dark:bg-black">
                                        <img src={user.avatar} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black" alt={user.username} />
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate w-20 text-center">{user.username}</span>
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

    // Interaction State from Context
    const { likedPostIds, savedPostIds, toggleLike, toggleSave, loadInteractions } = useInteractions();
    const [sharePost, setSharePost] = useState<Post | null>(null);
    const navigate = useNavigate();

    // Modals
    const [commentsPost, setCommentsPost] = useState<Post | null>(null);
    const [likesPost, setLikesPost] = useState<Post | null>(null);
    const [menuPost, setMenuPost] = useState<Post | null>(null);
    const [editPost, setEditPost] = useState<Post | null>(null);
    const [deletePost, setDeletePost] = useState<Post | null>(null);

    // Load Feed
    const refreshPosts = async () => {
        try {
            const feedPosts = await DBService.getFeed(currentUser.id);
            setPosts(feedPosts);

            // Fetch users for posts
            const userIds = new Set(feedPosts.map(p => p.userId));
            const fetchedUsers = await DBService.getUsersByIds(Array.from(userIds));
            const userMap: Record<string, User> = {};
            fetchedUsers.forEach(u => userMap[u.id] = u);
            setUsers(prev => ({ ...prev, ...userMap }));

            // Load interactions
            const postIds = feedPosts.map(p => p.id);
            if (postIds.length > 0) {
                await loadInteractions(postIds);
            }
        } catch (error) {
            console.error("Error loading feed:", error);
            toast.error("Failed to load feed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshPosts();
        loadStories();
    }, [currentUser.id]);

    const loadStories = async () => {
        try {
            const stories = await DBService.getStories();
            setAllStories(stories);
            const userIds = Array.from(new Set(stories.map(s => s.userId)));
            const users = await DBService.getUsersByIds(userIds);
            setStoryUsers(users);
        } catch (error) {
            console.error("Error loading stories:", error);
        }
    };

    // Handlers
    const handleLike = async (postId: string) => {
        const isLiked = likedPostIds.includes(postId);
        await toggleLike(postId);
        // Optimistically update count
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const currentLikes = Array.isArray(p.likes) ? p.likes.length : (p.likes || 0);
                const newCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
                // We're not updating the array here, just the count for display if needed depending on logic
                // Ideally backend handles the array. For UI count:
                return { ...p, likeCount: newCount };
            }
            return p;
        }));
    };

    const handleSave = async (post: Post) => {
        await toggleSave(post.id);
        toast.success(savedPostIds.includes(post.id) ? "Removed from favourites" : "Added to favourites");
    };

    const handleDelete = async () => {
        if (!deletePost) return;
        try {
            await DBService.deletePost(deletePost.id); // Assuming hard delete or soft delete
            toast.success("Post deleted");
            setPosts(prev => prev.filter(p => p.id !== deletePost.id));
            setDeletePost(null);
        } catch (error) {
            toast.error("Failed to delete post");
        }
    };

    const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            try {
                await DBService.uploadStory(currentUser.id, e.target.files[0]);
                toast.success("Story uploaded!");
                loadStories();
            } catch (error) {
                toast.error("Failed to upload story");
            }
        }
    };

    // Group stories
    const storiesByUser = allStories.reduce((acc, story) => {
        if (!acc[story.userId]) acc[story.userId] = [];
        acc[story.userId].push(story);
        return acc;
    }, {} as Record<string, Story[]>);

    if (loading) {
        return (
            <div className="flex justify-center pt-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="pb-28 pt-4 md:pb-8">
            {/* Story Upload Input */}
            <input
                type="file"
                id="story-file-input"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleStoryUpload}
            />

            <h1 className="text-2xl font-bold px-4 mb-4 text-gray-900 dark:text-white">Memories</h1>
            <StoriesBento
                currentUser={currentUser}
                storyUsers={storyUsers}
                storiesByUser={storiesByUser}
                onStoryClick={setViewingStoryUserId}
                onUserClick={onUserClick}
            />

            {/* Modals */}
            {commentsPost && (
                <CommentsSheet
                    post={commentsPost}
                    currentUser={currentUser}
                    onClose={() => setCommentsPost(null)}
                    onCommentAdded={refreshPosts}
                />
            )}
            {likesPost && (
                <LikesSheet
                    post={likesPost}
                    currentUser={currentUser}
                    onClose={() => setLikesPost(null)}
                    onUserClick={(userId) => {
                        setLikesPost(null);
                        onUserClick?.(userId);
                    }}
                />
            )}
            {sharePost && (
                <SharePostModal
                    post={sharePost}
                    currentUser={currentUser}
                    onClose={() => setSharePost(null)}
                />
            )}
            {deletePost && (
                <DeleteConfirmModal
                    onConfirm={handleDelete}
                    onClose={() => setDeletePost(null)}
                />
            )}
            {editPost && (
                <EditPostModal
                    post={editPost}
                    onSave={async (caption) => {
                        await DBService.updatePost(editPost.id, { caption });
                        refreshPosts();
                        setEditPost(null);
                    }}
                    onClose={() => setEditPost(null)}
                />
            )}
            {viewingStoryUserId && (
                <StoryViewer
                    stories={storiesByUser[viewingStoryUserId] || []}
                    user={users[viewingStoryUserId] || currentUser}
                    onClose={() => setViewingStoryUserId(null)}
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

            {/* Posts Feed - Memories Style */}
            <div className="flex flex-col gap-8 px-4 max-w-lg mx-auto w-full">
                {posts.map(post => {
                    const user = users[post.userId] || { username: 'Unknown User', avatar: '', id: post.userId } as User;
                    const isLiked = likedPostIds.includes(post.id);
                    const isSaved = savedPostIds.includes(post.id);
                    
                    const likeCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);

                    return (
                        <div key={post.id} className="relative group/card">
                            {/* Floating Tile Card */}
                            <div className="bg-white dark:bg-dark-card rounded-[32px] shadow-soft hover:shadow-lg transition-all duration-300 overflow-hidden border border-white/50 dark:border-white/5">
                                
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 pl-5">
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick?.(user.id)}>
                                        <div className="w-10 h-10 p-[2px] bg-gradient-to-tr from-accent to-primary rounded-full">
                                            <div className="w-full h-full rounded-full border-2 border-white dark:border-dark-card overflow-hidden">
                                                 {user.avatar ? (
                                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                                ) : <SkeletonAvatar className="w-full h-full" />}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight">{user.username}</span>
                                            <span className="text-xs text-gray-400 font-medium">{formatRelativeTime(post.createdAt)}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setMenuPost(post)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Media Section with Overlay */}
                                <div className="relative w-full aspect-[4/5] bg-gray-100 dark:bg-black/20 overflow-hidden">
                                     {post.mediaType === 'video' ? (
                                        <video
                                            src={post.imageUrl || ''}
                                            className="w-full h-full object-cover"
                                            controls={false}
                                            muted
                                            loop
                                            playsInline
                                            onClick={() => navigate(`/post/${post.id}`)}
                                        />
                                    ) : (
                                        <img
                                            src={post.imageUrl || ''}
                                            alt="Post"
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onClick={() => navigate(`/post/${post.id}`)}
                                        />
                                    )}

                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-end justify-between p-6 pointer-events-none">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleLike(post.id)}
                                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all group/btn pointer-events-auto"
                                            >
                                                <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white group-hover/btn:scale-110 transition-transform'}`} />
                                            </button>
                                            <button
                                                onClick={() => setCommentsPost(post)}
                                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all text-white pointer-events-auto"
                                            >
                                                <MessageSquare className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={() => setSharePost(post)}
                                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all text-white pointer-events-auto"
                                            >
                                                <Send className="w-6 h-6" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleSave(post)}
                                            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all text-white pointer-events-auto"
                                        >
                                            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-white text-white' : 'text-white'}`} />
                                        </button>
                                    </div>
                                    
                                    {/* Always Visible Like Counter (if overlay hidden on mobile, fallback) */}
                                    <div className="absolute bottom-4 left-4 sm:hidden pointer-events-none">
                                         <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-white text-sm font-medium">
                                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                            {likeCount > 0 && likeCount}
                                        </div>
                                    </div>
                                </div>

                                {/* Caption Section */}
                                <div className="p-5 pt-4">
                                    {likeCount > 0 && (
                                        <div 
                                            className="flex items-center gap-2 mb-2 cursor-pointer"
                                            onClick={() => setLikesPost(post)}
                                        >
                                            <div className="flex -space-x-2">
                                                <div className="w-5 h-5 rounded-full bg-gray-200 border border-white dark:border-dark-card" />
                                                <div className="w-5 h-5 rounded-full bg-gray-300 border border-white dark:border-dark-card" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {likeCount} likes
                                            </span>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">
                                            <span className="font-bold mr-2 text-gray-900 dark:text-white">{user.username}</span>
                                            {post.caption}
                                        </p>
                                        {post.comments > 0 && (
                                            <button
                                                onClick={() => setCommentsPost(post)}
                                                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium mt-1"
                                            >
                                                View all {post.comments} comments
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {posts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-warm-neutral dark:bg-dark-card rounded-full flex items-center justify-center mb-4">
                            <Star className="w-10 h-10 text-accent/50" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Memories Yet</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">
                            Start capturing your moments to see them appear here in your memories feed.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Feed;
