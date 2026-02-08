import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { DBService } from '../services/database';
import { useInteractions } from '../context/InteractionContext';
import { ArrowLeft, Bookmark, Grid, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SavedProps {
    currentUser: User;
    onBack?: () => void;
    onPostClick?: (postId: string) => void;
}

const Saved: React.FC<SavedProps> = ({ currentUser, onBack, onPostClick }) => {
    const navigate = useNavigate();
    const { savedPostIds } = useInteractions();
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSavedPosts();
    }, [currentUser.id]);

    const loadSavedPosts = async () => {
        setLoading(true);
        try {
            const posts = await DBService.getSavedPosts(currentUser.id);
            setSavedPosts(posts);
        } catch (error) {
            console.error('Error loading saved posts:', error);
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

    return (
        <div className="h-full bg-white dark:bg-black overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-4 px-6 py-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                        </button>
                    )}
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Saved</h1>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 max-w-4xl mx-auto pb-24">
                {loading ? (
                    <div className="grid grid-cols-3 gap-1">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : savedPosts.filter(p => savedPostIds.includes(p.id)).length > 0 ? (
                    <div className="grid grid-cols-3 gap-1">
                        {savedPosts.filter(p => savedPostIds.includes(p.id)).map(post => (
                            <div
                                key={post.id}
                                onClick={() => handlePostClick(post.id)}
                                className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-xl"
                            >
                                <img src={post.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt="" />
                                {post.mediaType === 'video' && (
                                    <div className="absolute top-2 right-2">
                                        <Play className="w-5 h-5 text-white fill-white drop-shadow-md" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                                    <span className="text-white font-bold">{Array.isArray(post.likes) ? post.likes.length : post.likes} ❤️</span>
                                    <span className="text-white font-bold">{post.comments} 💬</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-400">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center">
                            <Bookmark className="w-10 h-10" />
                        </div>
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Save</h3>
                        <p className="text-sm max-w-xs mx-auto">
                            Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Saved;
