
import React, { useState, useEffect } from 'react';
import { User, Post, Story } from '../types';
import { DBService } from '../services/database';
import { Heart, MessageSquare, Send, MoreHorizontal, Loader2, Play } from 'lucide-react';
import StoryViewer from '../components/StoryViewer';

interface FeedProps {
    currentUser: User;
    onUserClick?: (userId: string) => void;
}

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
                    <div className="w-[72px] h-[72px] rounded-[24px] border-2 border-dashed border-snuggle-300 dark:border-snuggle-700 p-1 flex items-center justify-center cursor-pointer hover:bg-snuggle-50 dark:hover:bg-dark-border transition-colors">
                        <div className="w-full h-full rounded-[18px] bg-snuggle-100 dark:bg-dark-bg flex items-center justify-center">
                            <span className="text-2xl text-snuggle-500">+</span>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Add Story</span>
                </div>

                {storyUsers.map(user => {
                    const userStories = storiesByUser[user.id] || [];
                    const allViewed = userStories.every(s => s.views && s.views.includes(currentUser.id));

                    return (
                        <div key={user.id} className="flex flex-col items-center space-y-1 min-w-[72px]" onClick={() => onStoryClick(user.id)}>
                            <div className={`w-[72px] h-[72px] rounded-[24px] p-[2px] cursor-pointer transition-all ${allViewed ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gradient-to-tr from-snuggle-400 to-emerald-600'}`}>
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

    useEffect(() => {
        const loadFeed = async () => {
            setLoading(true);
            try {
                // Use getFeed to fetch posts from followed users + self
                const feedPosts = await DBService.getFeed(currentUser.id, 50);
                setPosts(feedPosts);

                // Fetch users for posts
                const uIds = new Set(feedPosts.map(p => p.userId));
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

    const handleLike = (postId: string) => {
        console.log('Liked', postId);
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


    if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-snuggle-500" /></div>;

    return (
        <div className="pb-20 pt-0">
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

            <div className="space-y-4 px-2">
                {posts.map(post => {
                    const user = users[post.userId];
                    if (!user) return null;

                    return (
                        <div key={post.id} className="bg-white dark:bg-dark-card rounded-bento p-4 shadow-sm transition-colors border border-transparent dark:border-dark-border">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick?.(user.id)}>
                                    <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-700" alt="" />
                                    <div>
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{user.username}</h3>
                                        <p className="text-[10px] text-gray-400">2h ago</p>
                                    </div>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="rounded-[24px] overflow-hidden mb-3 bg-gray-100 dark:bg-black relative border border-gray-100 dark:border-dark-border">
                                {post.mediaType === 'video' ? (
                                    <div className="relative">
                                        <video src={post.imageUrl} className="w-full h-auto max-h-[500px] object-cover" controls />
                                    </div>
                                ) : (
                                    <img src={post.imageUrl} className="w-full h-auto object-cover" alt="Post" />
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => handleLike(post.id)} className="group flex items-center gap-1.5">
                                        <div className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 group-hover:text-red-500 transition-colors">
                                            <Heart className={`w-6 h-6 ${post.likes > 0 ? 'fill-red-500 text-red-500' : 'text-gray-800 dark:text-gray-300'}`} />
                                        </div>
                                        <span className="font-bold text-sm text-gray-900 dark:text-gray-200">{post.likes}</span>
                                    </button>

                                    <button className="group flex items-center gap-1.5">
                                        <div className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group-hover:text-emerald-500 transition-colors">
                                            <MessageSquare className="w-6 h-6 text-gray-800 dark:text-gray-300" />
                                        </div>
                                        <span className="font-bold text-sm text-gray-900 dark:text-gray-200">{post.comments}</span>
                                    </button>

                                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors">
                                        <Send className="w-6 h-6 text-gray-800 dark:text-gray-300" />
                                    </button>
                                </div>
                            </div>

                            {/* Caption */}
                            <div className="px-1">
                                <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed">
                                    <span className="font-bold mr-2 text-gray-900 dark:text-white">{user.username}</span>
                                    {post.caption}
                                </p>
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
