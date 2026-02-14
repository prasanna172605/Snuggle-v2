
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Heart, MessageSquare, Send, MoreVertical, Play, Pause, ChevronLeft, Volume2, VolumeX, Copy, Flag } from 'lucide-react';
import { DBService } from '../services/database';
import { Memory, Comment as AppComment } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import CommentsSheet from '../components/CommentsSheet';
import ShareSheet from '../components/ShareSheet';

const MemoryViewer: React.FC = () => {
    const { memoryId } = useParams<{ memoryId: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [memory, setMemory] = useState<Memory | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showShareSheet, setShowShareSheet] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (memoryId) {
            loadMemory(memoryId);
        }
    }, [memoryId]);

    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.play().catch(() => {});
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying, memory]);

    const loadMemory = async (id: string) => {
        try {
            setLoading(true);
            const data = await DBService.getMemory(id);
            setMemory(data);
        } catch (error) {
            console.error('Failed to load memory:', error);
            toast.error('Could not load memory');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!memory || !currentUser) return;
        
        // Optimistic
        const newIsLiked = !memory.isLiked;
        setMemory(prev => prev ? { 
             ...prev, 
             isLiked: newIsLiked, 
             likesCount: newIsLiked ? prev.likesCount + 1 : prev.likesCount - 1 
        } : null);

        try {
            await DBService.toggleMemoryLike(memory.id, currentUser.id);
        } catch (error) {
            // Revert
             setMemory(prev => prev ? { 
                 ...prev, 
                 isLiked: !newIsLiked, 
                 likesCount: !newIsLiked ? prev.likesCount + 1 : prev.likesCount - 1 
            } : null);
        }
    };

    const handleShare = () => {
        setShowShareSheet(true);
        setShowMenu(false);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white">
                <div className="animate-spin w-10 h-10 border-4 border-snuggle-500 rounded-full border-t-transparent mb-4"/>
                <p className="text-gray-400 font-medium">Loading memory...</p>
            </div>
        );
    }

    if (!memory) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-6">
                    <X size={40} className="text-gray-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Memory not found</h2>
                <p className="text-gray-400 mb-8 max-w-xs">This memory may have been deleted or is no longer available.</p>
                <button 
                    onClick={() => navigate(-1)}
                    className="px-8 py-3 bg-snuggle-600 rounded-full font-bold hover:bg-snuggle-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Adapt Memory to Post type for CommentsSheet compatibility
    // This is a temporary mapping until types are fully unified or CommentsSheet is updated
    const memoryAsPost: any = {
        ...memory,
        likes: memory.likesCount, // CommentsSheet might expect this structure
        comments: memory.commentsCount
    };



    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {memory && currentUser && (
                <ShareSheet 
                    isOpen={showShareSheet} 
                    onClose={() => setShowShareSheet(false)}
                    content={{
                        id: memory.id,
                        type: 'memory',
                        title: memory.caption,
                        imageUrl: memory.mediaUrl
                    }}
                    currentUser={currentUser}
                />
            )}
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-8 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <button onClick={() => navigate(-1)} className="text-white hover:opacity-80 transition-opacity">
                        <ChevronLeft size={28} />
                    </button>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/profile/${memory.userId}`)}>
                        <img 
                            src={memory.user?.avatar || memory.user?.photoURL} 
                            className="w-8 h-8 rounded-full border border-white/50 object-cover" 
                        />
                        <span className="font-semibold text-white text-sm shadow-sm">{memory.user?.username}</span>
                    </div>
                </div>
                <div className="relative pointer-events-auto">
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-white hover:opacity-80 transition-opacity"
                    >
                        <MoreVertical size={24} />
                    </button>
                    
                    {/* Menu Dropdown */}
                    {showMenu && (
                        <div className="absolute top-10 right-0 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                             <button 
                                onClick={handleShare}
                                className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-2"
                            >
                                <Copy className="w-4 h-4" /> Copy Link
                            </button>
                             <button 
                                onClick={() => { setShowMenu(false); toast.info("Reported"); }}
                                className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-2"
                            >
                                <Flag className="w-4 h-4" /> Report
                            </button>
                        </div>
                    )}
                     {showMenu && <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />}
                </div>
            </div>

            {/* Media Content */}
            <div className="flex-1 flex items-center justify-center relative bg-black">
                {memory.type === 'image' ? (
                    <img 
                        src={memory.mediaUrl} 
                        className="w-full h-full object-contain"
                        onDoubleClick={handleLike}
                        crossOrigin="anonymous"
                    />
                ) : (
                    <div 
                        className="w-full h-full relative flex items-center justify-center"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        <video 
                            src={memory.mediaUrl} 
                            className="max-h-full max-w-full object-contain"
                            loop
                            playsInline
                            autoPlay
                            muted={isMuted}
                            ref={videoRef}
                            crossOrigin="anonymous"
                        />
                         {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                <Play size={64} className="text-white/80" fill="currentColor" />
                            </div>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                            className="absolute bottom-32 right-4 p-2 bg-black/50 rounded-full text-white z-30 opacity-0 hover:opacity-100 transition-opacity"
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Overlay Actions & Caption */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none">
                <div className="flex items-end justify-between mb-4 pointer-events-auto">
                    <div className="flex-1 mr-16">
                         <p className="text-white text-sm leading-snug line-clamp-3 font-medium drop-shadow-md">
                            <span className="font-bold mr-2 text-lg block mb-1">{memory.user?.username}</span>
                            {memory.caption}
                        </p>
                    </div>

                    {/* Vertical Actions Rail */}
                    <div className="flex flex-col items-center gap-6 pb-2">
                        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                            <Heart 
                                className={`w-8 h-8 transition-transform group-active:scale-75 drop-shadow-lg ${memory.isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} 
                                strokeWidth={1.5}
                            />
                            <span className="text-xs font-medium text-white drop-shadow-md">{memory.likesCount}</span>
                        </button>
                        
                        <button 
                            onClick={() => setShowComments(true)}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <MessageSquare className="w-8 h-8 text-white transition-transform group-active:scale-75 drop-shadow-lg" strokeWidth={1.5} />
                            <span className="text-xs font-medium text-white drop-shadow-md">{memory.commentsCount}</span>
                        </button>

                        <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                            <Send className="w-8 h-8 text-white transition-transform group-active:scale-75 -rotate-12 drop-shadow-lg" strokeWidth={1.5} />
                            <span className="text-xs font-medium text-white drop-shadow-md">Share</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Comments Sheet */}
            {showComments && currentUser && (
                <CommentsSheet 
                    post={memoryAsPost}
                    currentUser={currentUser}
                    onClose={() => setShowComments(false)}
                    onCommentAdded={() => {
                        setMemory(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
                    }}
                />
            )}
        </div>
    );
};

export default MemoryViewer;
