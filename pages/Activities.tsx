import React, { useState, useEffect } from 'react';
import { User, Post, Comment } from '../types';
import { DBService } from '../services/database';
import { ArrowLeft, Heart, MessageSquare, Reply, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

interface ActivitiesProps {
    currentUser: User;
    onBack?: () => void;
    onPostClick?: (postId: string) => void;
}

type ActivityTab = 'likes' | 'comments' | 'replies';

const Activities: React.FC<ActivitiesProps> = ({ currentUser, onBack, onPostClick }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<ActivityTab>('likes');
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [userComments, setUserComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivities();
    }, [activeTab, currentUser.id]);

    const loadActivities = async () => {
        setLoading(true);
        try {
            if (activeTab === 'likes') {
                const posts = await DBService.getLikedPosts(currentUser.id);
                setLikedPosts(posts);
            } else if (activeTab === 'comments') {
                const comments = await DBService.getUserComments(currentUser.id);
                setUserComments(comments);
            } else {
                // Future: Implement replies fetching
            }
        } catch (e) {
            console.error('Error loading activities:', e);
        } finally {
            setLoading(false);
        }
    };

    const handlePostClick = (postId: string) => {
        if (onPostClick) {
            onPostClick(postId);
        } else {
            navigate(`/post/${postId}`);
        }
    };

    const tabs = [
        { id: 'likes' as ActivityTab, label: 'Likes', icon: Heart },
        { id: 'comments' as ActivityTab, label: 'Comments', icon: MessageSquare },
        { id: 'replies' as ActivityTab, label: 'Story Replies', icon: Reply },
    ];

    const menuItems = [
        { icon: ChevronRight, label: 'Interactions', desc: 'Review and delete likes, comments, and your other interactions', action: () => { } },
        { icon: ChevronRight, label: 'Photos & Videos', desc: 'View, archive or delete photos and videos you\'ve shared.', action: () => { } },
        { icon: ChevronRight, label: 'Account History', desc: 'Review changes you\'ve made to your account since you created it.', action: () => { } },
        { icon: Trash2, label: 'Recently Deleted', desc: 'View and restore or permanently delete your removed content.', action: () => navigate('/recently-deleted'), isHighlighted: true },
    ];

    return (
        <div className="h-full bg-white dark:bg-black overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-4 px-4 py-4">
                    {onBack && (
                        <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    <h1 className="text-xl font-bold text-snuggle-600 dark:text-snuggle-400">Your Activity</h1>
                </div>
            </div>

            <div className="flex flex-col md:flex-row h-[calc(100%-65px)]">
                {/* Left Sidebar */}
                <div className="md:w-72 border-r border-gray-100 dark:border-dark-border p-4 flex-shrink-0">
                    <div className="space-y-2">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={item.action}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left ${item.isHighlighted ? 'bg-red-50 dark:bg-red-900/20' : ''
                                    }`}
                            >
                                <div className="flex-1">
                                    <p className={`font-semibold text-sm ${item.isHighlighted ? 'text-red-600 dark:text-red-400' : ''}`}>{item.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                                </div>
                                <item.icon className={`w-5 h-5 ${item.isHighlighted ? 'text-red-500' : 'text-gray-400'}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-dark-border sticky top-0 bg-white dark:bg-black z-10">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab.id
                                    ? 'border-snuggle-600 text-snuggle-600 dark:border-snuggle-400 dark:text-snuggle-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Sort & Filter */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                        <div className="flex gap-4">
                            <button className="text-sm font-semibold">Newest to oldest</button>
                            <button className="text-sm font-semibold text-gray-400">Sort & filter</button>
                        </div>
                        <button className="text-sm font-semibold text-snuggle-600">Select</button>
                    </div>

                    {/* Content Grid/List */}
                    <div className="p-4">
                        {loading ? (
                            <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-snuggle-600" />
                            </div>
                        ) : (
                            <>
                                {activeTab === 'likes' && (
                                    likedPosts.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-1">
                                            {likedPosts.map(post => (
                                                <div
                                                    key={post.id}
                                                    onClick={() => handlePostClick(post.id)}
                                                    className="aspect-square relative group cursor-pointer"
                                                >
                                                    {post.mediaType === 'video' ? (
                                                        <video src={post.imageUrl} className="w-full h-full object-cover rounded-lg" />
                                                    ) : (
                                                        <img src={post.imageUrl} className="w-full h-full object-cover rounded-lg" alt="" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                        <Heart className="w-6 h-6 text-white fill-white" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 text-gray-400">
                                            <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                            <p>No likes yet</p>
                                        </div>
                                    )
                                )}

                                {activeTab === 'comments' && (
                                    userComments.length > 0 ? (
                                        <div className="space-y-3">
                                            {userComments.map(comment => (
                                                <div 
                                                    key={comment.id} 
                                                    onClick={() => handlePostClick(comment.postId)}
                                                    className="p-4 bg-gray-50 dark:bg-dark-card rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">Commented on a post</p>
                                                    <p className="text-gray-600 dark:text-gray-300 line-clamp-2">"{comment.text}"</p>
                                                    <p className="text-xs text-gray-400 mt-2">{formatRelativeTime(comment.createdAt)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 text-gray-400">
                                            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                            <p>No comments yet</p>
                                        </div>
                                    )
                                )}

                                {activeTab === 'replies' && (
                                    <div className="text-center py-20 text-gray-400">
                                        <Reply className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p>No replies yet</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Activities;
