import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Send, Star, MoreHorizontal, Play, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { Memory } from '../../types';
import { DBService } from '../../services/database';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface MemoryCardProps {
  memory: Memory;
  currentUserId: string;
  onMemoryUpdate?: (updatedMemory: Memory) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, currentUserId, onMemoryUpdate }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(memory.isLiked || false);
  const [likeCount, setLikeCount] = useState(memory.likesCount || 0);
  const [isMuted, setIsMuted] = useState(true);

  const [isSaved, setIsSaved] = useState(memory.isSaved || false);

  const handleLike = async () => {
    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);

    try {
      await DBService.toggleMemoryLike(memory.id, currentUserId);
    } catch (error) {
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
      toast.error('Failed to update like');
    }
  };

  const handleSave = async () => {
    // Optimistic update
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);

    try {
      await DBService.toggleMemorySave(memory.id, currentUserId);
      toast.success(newIsSaved ? 'Added to Favourites' : 'Removed from Favourites');
    } catch (error) {
      // Revert on error
      setIsSaved(!newIsSaved);
      toast.error('Failed to update favourites');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Snuggle Memory by ${memory.user?.username}`,
        text: memory.caption,
        url: window.location.origin + `/memory/${memory.id}`
      });
    } else {
        // Fallback or internal share
        toast.success('Link copied to clipboard');
        navigator.clipboard.writeText(window.location.origin + `/memory/${memory.id}`);
    }
  };

  const renderMedia = () => {
    if (memory.type === 'image') {
      return (
        <div className="relative w-full aspect-[4/5] bg-gray-100 dark:bg-black/20 overflow-hidden rounded-[24px]">
             <img 
                src={memory.mediaUrl} 
                alt={memory.caption}
                className="w-full h-full object-cover"
                onDoubleClick={handleLike}
                crossOrigin="anonymous"
             />
        </div>
      );
    }

    if (memory.type === 'video') {
         return (
            <div className="relative w-full aspect-video bg-black rounded-[24px] overflow-hidden group">
                <video
                    src={memory.mediaUrl}
                    className="w-full h-full object-contain"
                    loop
                    muted={isMuted}
                    playsInline
                    crossOrigin="anonymous"
                    onClick={(e) => {
                        const vid = e.target as HTMLVideoElement;
                        vid.paused ? vid.play() : vid.pause();
                    }}
                />
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <Play className="w-12 h-12 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                </div>
            </div>
         );
    }

    if (memory.type === 'reel') {
        return (
            <div 
                className="relative w-full aspect-[9/16] bg-black rounded-[24px] overflow-hidden cursor-pointer"
                onClick={() => navigate(`/memory/${memory.id}`)} // Open full screen viewer
            >
                <video
                    src={memory.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    crossOrigin="anonymous"
                    onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                    onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                />
                 <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full flex items-center gap-2">
                    <Play size={12} className="fill-white text-white" />
                    <span className="text-xs font-medium text-white">Reel</span>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="bg-transparent mb-8">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div 
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => navigate(`/profile/${memory.userId}`)}
        >
          <div className="relative mt-1">
            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-snuggle-400 to-snuggle-600">
              <div className="w-full h-full rounded-full bg-white dark:bg-dark-card p-[1.5px]">
                <img 
                    src={memory.user?.avatar || memory.user?.photoURL || `https://ui-avatars.com/api/?name=${memory.user?.username}`} 
                    className="w-full h-full rounded-full object-cover"
                    alt={memory.user?.username}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {memory.user?.username}
                </h3>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">•</span>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                {typeof memory.createdAt === 'number' ? formatDistanceToNow(memory.createdAt, { addSuffix: true }) : 'Just now'}
                </p>
            </div>
            {/* Caption centered under name */}
            {memory.caption && (
                <div className="text-[13px] text-gray-800 dark:text-gray-200 leading-snug mt-0.5 pr-2">
                    {memory.caption}
                </div>
            )}
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-1">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media */}
      <div className="p-2">
        {renderMedia()}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
             <button onClick={handleLike} className="flex items-center gap-1.5 group">
                <Heart className={`w-[26px] h-[26px] transition-all group-active:scale-75 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-900 dark:text-white hover:text-red-500'}`} />
                {likeCount > 0 && <span className="text-xs font-bold text-gray-900 dark:text-white">{likeCount}</span>}
             </button>
             <button onClick={() => navigate(`/memory/${memory.id}`)} className="flex items-center gap-1.5 group">
                <MessageSquare className="w-5 h-5 text-gray-900 dark:text-white hover:text-snuggle-500 transition-colors" />
                {memory.commentsCount > 0 && <span className="text-xs font-bold text-gray-900 dark:text-white">{memory.commentsCount}</span>}
             </button>
             <button onClick={handleShare} className="flex items-center gap-1.5 group">
                <Send className="w-5 h-5 text-gray-900 dark:text-white hover:text-snuggle-500 transition-colors" />
             </button>
        </div>
        <button onClick={handleSave} className="text-gray-900 dark:text-white hover:text-amber-500 transition-all group-active:scale-75">
            <Star className={`w-[26px] h-[26px] ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default MemoryCard;
