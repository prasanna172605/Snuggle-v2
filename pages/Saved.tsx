import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { DBService } from '../services/database';
import { ArrowLeft, Bookmark, Grid, Play } from 'lucide-react';

interface SavedProps {
    currentUser: User;
    onBack?: () => void;
}

const Saved: React.FC<SavedProps> = ({ currentUser, onBack }) => {
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
                    <h1 className="text-xl font-bold">Saved</h1>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 max-w-4xl mx-auto">
                {loading ? (
                    <div className="grid grid-cols-3 gap-1">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : savedPosts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1">
                        {savedPosts.map(post => (
                            <div key={post.id} className="aspect-square relative group cursor-pointer">
                                <img src={post.imageUrl} className="w-full h-full object-cover rounded-lg" alt="" />
                                {post.mediaType === 'video' && (
                                    <div className="absolute top-2 right-2">
                                        <Play className="w-5 h-5 text-white fill-white" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-lg">
                                    <span className="text-white font-semibold">{post.likes} ❤️</span>
                                    <span className="text-white font-semibold">{post.comments} 💬</span>
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
