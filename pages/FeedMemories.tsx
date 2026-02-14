import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { DBService } from '../services/database';
import { Memory, Story, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import MemoryCard from '../components/memories/MemoryCard';
import { toast } from 'sonner';
import StoryViewer from '../components/StoryViewer';
import CommentsSheet from '../components/CommentsSheet';

// Modals
const EditMemoryModal: React.FC<{
    memory: Memory;
    onSave: (caption: string) => void;
    onClose: () => void;
}> = ({ memory, onSave, onClose }) => {
    const [caption, setCaption] = useState(memory.caption);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(caption);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-dark-surface rounded-2xl overflow-hidden z-10">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                    <button onClick={onClose} className="text-gray-500 font-medium">Cancel</button>
                    <h3 className="font-bold text-lg text-black dark:text-white">Edit Memory</h3>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-snuggle-500 font-bold disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Done'}
                    </button>
                </div>
                <div className="p-4">
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full h-32 bg-gray-100 dark:bg-dark-bg rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-snuggle-500/30 resize-none text-black dark:text-white"
                        placeholder="Write a caption..."
                    />
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmModal: React.FC<{
    onConfirm: () => void;
    onClose: () => void;
}> = ({ onConfirm, onClose }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-dark-surface rounded-2xl overflow-hidden text-center z-10">
                <div className="p-6">
                    <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-black dark:text-white mb-2">Delete Memory?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        This memory will be moved to Recently Deleted. You can restore it within 30 days.
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

// Stories Bento Component (Inline for now or import if extracted)
// Reusing logic from Feed.tsx
const StoriesBento: React.FC<{
    onUserClick?: (id: string) => void;
    onStoryClick: (userId: string) => void;
    storyUsers: User[];
    storiesByUser: Record<string, Story[]>;
    currentUser: User | null;
    onAddStory: () => void;
}> = ({ onUserClick, onStoryClick, storyUsers, storiesByUser, currentUser, onAddStory }) => {
    if (!currentUser) return null;
    return (
        <div className="mb-6 px-4 overflow-x-auto no-scrollbar pt-2">
            <div className="flex gap-4">
                {/* My Story */}
                <div className="flex flex-col items-center space-y-1 min-w-[72px] relative group" onClick={() => {
                    const myStories = storiesByUser[currentUser.id];
                    if (myStories && myStories.length > 0) {
                        onStoryClick(currentUser.id);
                    } else {
                        onAddStory();
                    }
                }}>
                    <div className={`w-[72px] h-[72px] rounded-full p-[3px] cursor-pointer transition-all ${storiesByUser[currentUser.id]?.length ? 'bg-gradient-to-tr from-snuggle-400 to-snuggle-600' : 'bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-600'}`}>
                        <div className="w-full h-full rounded-full p-[2px] relative overflow-hidden">
                            <img src={currentUser.avatar} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black" alt="Your Story" />
                            <div
                                onClick={(e) => { e.stopPropagation(); onAddStory(); }}
                                className="absolute bottom-0 right-0 w-6 h-6 bg-snuggle-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center hover:bg-snuggle-600 transition-colors z-10"
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
                        const allViewed = userStories && userStories.length > 0 && userStories.every(s => s.views && s.views.includes(currentUser.id));
                        return (
                            <div key={user.id} className="flex flex-col items-center space-y-1 min-w-[72px] group" onClick={() => onStoryClick(user.id)}>
                                <div className={`w-[72px] h-[72px] rounded-full p-[3px] cursor-pointer transition-transform group-hover:scale-105 ${allViewed ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gradient-to-tr from-snuggle-400 to-snuggle-600'}`}>
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

const FeedMemories: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDocId, setLastDocId] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Stories State
    const [allStories, setAllStories] = useState<Story[]>([]);
    const [storyUsers, setStoryUsers] = useState<User[]>([]);
    const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null);

    // Interaction State
    const [commentsMemory, setCommentsMemory] = useState<Memory | null>(null);
    const [editMemory, setEditMemory] = useState<Memory | null>(null);
    const [deleteMemory, setDeleteMemory] = useState<Memory | null>(null);

    // Hooks must be called before early returns
    useEffect(() => {
        if (!currentUser) return;
        
        console.log('[FeedMemories] Synchronizing with Firebase Auth...');
        
        // Wait for Firebase Auth to be ready before querying Firestore.
        // This prevents "Missing or insufficient permissions" on native apps 
        // where the SDK takes a moment to recover the session.
        const authUnsubscribe = onAuthStateChanged(DBService.getAuth(), (firebaseUser: any) => {
            if (firebaseUser) {
                // Assuming Chat type and setChats/chats state are defined elsewhere if this block is fully intended.
                // For now, only applying the onAuthStateChanged change as per instruction.
                console.log('[FeedMemories] Auth synced. Loading initial feed...');
                loadMemories(true);
                loadStories();
            }
        });

        return () => authUnsubscribe();
    }, [currentUser]); 

    const loadMemories = async (isRefresh = false) => {
        try {
            if (isRefresh) setLoading(true);
            
            const startAfterId = isRefresh ? undefined : lastDocId;
            const newMemories = await DBService.getMemoriesFeed(startAfterId);
            
            if (newMemories.length < 10) {
                setHasMore(false);
            }

            if (isRefresh) {
                setMemories(newMemories);
            } else {
                setMemories(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNew = newMemories.filter(m => !existingIds.has(m.id));
                    return [...prev, ...uniqueNew];
                });
            }

            if (newMemories.length > 0) {
                setLastDocId(newMemories[newMemories.length - 1].id);
            }
        } catch (error) {
            console.error('Failed to load memories:', error);
            // toast.error('Could not load feed'); // Suppress initial toast spam if needed
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

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

    const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentUser) return;
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

    // --- Redundant useEffect removed to prevent race conditions ---

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    setLoadingMore(true);
                    loadMemories();
                }
            },
            { threshold: 0.5 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, lastDocId]);

    const handleMemoryUpdate = (updatedMemory: Memory) => {
        setMemories(prev => prev.map(m => m.id === updatedMemory.id ? updatedMemory : m));
    };

    const handleDelete = async () => {
        if (!deleteMemory || !currentUser) return;
        try {
            await DBService.softDeletePost(deleteMemory.id, currentUser.id); // Reusing post soft delete for memories
            setMemories(prev => prev.filter(m => m.id !== deleteMemory.id));
            toast.success("Memory deleted");
            setDeleteMemory(null);
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete memory");
        }
    };

    // Group stories
    const storiesByUser = allStories.reduce((acc, story) => {
        if (!acc[story.userId]) acc[story.userId] = [];
        acc[story.userId].push(story);
        return acc;
    }, {} as Record<string, Story[]>);

    if (!currentUser) return null;

    // Adapt Memory to Post type for CommentsSheet compatibility
    // TODO: Update CommentsSheet to accept Memory type directly
    const memoryToPost = (memory: Memory): any => ({
        ...memory,
        likes: memory.likesCount,
        comments: memory.commentsCount,
        imageUrl: memory.mediaUrl, // Mapping for compatibility
        mediaType: memory.type === 'image' ? 'image' : 'video' 
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 md:pb-0">
             {/* Story Input */}
             <input
                type="file"
                id="story-file-input"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleStoryUpload}
            />

             {/* Header */}
             <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 px-4 h-16 flex items-center justify-between">
                <h1 className="text-xl font-bold text-snuggle-600 dark:text-snuggle-400">
                    Memories
                </h1>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => loadMemories(true)}
                        className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Removed + Button */}
                </div>
             </div>

             {/* Stories & Feed */}
             <div className="pt-4">
                <StoriesBento
                    currentUser={currentUser}
                    storyUsers={storyUsers}
                    storiesByUser={storiesByUser}
                    onStoryClick={setViewingStoryUserId}
                    onAddStory={() => document.getElementById('story-file-input')?.click()}
                />
            
                <div className="max-w-md mx-auto px-4">
                {loading && memories.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-snuggle-500" />
                    </div>
                ) : memories.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                        <p className="text-lg font-medium mb-2">No memories yet</p>
                        <p className="text-sm">Create the first memory by tapping the + button!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {memories.map(memory => (
                            <MemoryCard 
                                key={memory.id} 
                                memory={memory} 
                                currentUserId={currentUser?.id || ''}
                                onMemoryUpdate={handleMemoryUpdate}
                                onCommentClick={setCommentsMemory}
                                onEdit={setEditMemory}
                                onDelete={setDeleteMemory}
                            />
                        ))}
                    </div>
                )}
                
                {/* Loader for infinite scroll */}
                <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                    {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-gray-400" />}
                </div>
             </div>
             </div>
 
             {viewingStoryUserId && (
                <StoryViewer
                    stories={storiesByUser[viewingStoryUserId] || []}
                    user={storyUsers.find(u => u.id === viewingStoryUserId) || currentUser}
                    onClose={() => setViewingStoryUserId(null)}
                />
            )}

            {/* Modals */}
            {commentsMemory && (
                <CommentsSheet 
                    post={memoryToPost(commentsMemory)}
                    currentUser={currentUser}
                    onClose={() => setCommentsMemory(null)}
                    onCommentAdded={() => {
                        // Optimistic or refresh
                        handleMemoryUpdate({ 
                            ...commentsMemory, 
                            commentsCount: commentsMemory.commentsCount + 1 
                        });
                    }}
                />
            )}

            {editMemory && (
                <EditMemoryModal
                    memory={editMemory}
                    onSave={async (caption) => {
                        try {
                            await DBService.updatePost(editMemory.id, { caption }); // Reusing updatePost
                            handleMemoryUpdate({ ...editMemory, caption });
                            toast.success("Updated!");
                            setEditMemory(null);
                        } catch (e) {
                            toast.error("Failed to update");
                        }
                    }}
                    onClose={() => setEditMemory(null)}
                />
            )}

            {deleteMemory && (
                <DeleteConfirmModal
                    onConfirm={handleDelete}
                    onClose={() => setDeleteMemory(null)}
                />
            )}

        </div>
    );
};

export default FeedMemories;
