import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageSquare, Send, Star, MoreHorizontal, MoreVertical, Play, Pause, 
  Volume2, VolumeX, Edit3, Trash2, Flag, Copy, Share2, MessageCircle, Bookmark 
} from 'lucide-react';
import ShareSheet from '../ShareSheet';
import { useTheme } from '../../context/ThemeContext';
import { Memory } from '../../types';
import { DBService } from '../../services/database';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface MemoryCardProps {
  memory: Memory;
  currentUserId: string;
  onMemoryUpdate?: (updatedMemory: Memory) => void;
  onCommentClick?: (memory: Memory) => void;
  onEdit?: (memory: Memory) => void;
  onDelete?: (memory: Memory) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, currentUserId, onMemoryUpdate, onCommentClick, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(memory.isLiked || false);
  const [likeCount, setLikeCount] = useState(memory.likesCount || 0);
  const [isMuted, setIsMuted] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

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
    setShowShareSheet(true);
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

    if (memory.type === 'video' || memory.type === 'reel') {
         return (
            <div 
                className="relative w-full aspect-[4/5] bg-black rounded-[24px] overflow-hidden cursor-pointer group"
                onClick={() => navigate(`/memory/${memory.id}`)}
            >
                <video
                    src={memory.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    crossOrigin="anonymous"
                    onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                    onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <Play className="w-12 h-12 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="currentColor" />
                </div>
                 <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full flex items-center gap-2 pointer-events-none">
                    <Play size={12} className="fill-white text-white" />
                    <span className="text-xs font-medium text-white">Watch Video</span>
                </div>
            </div>
         );
    }
  };

  return (
    <div className="bg-transparent mb-8 relative">
        <ShareSheet 
            isOpen={showShareSheet}
            onClose={() => setShowShareSheet(false)}
            content={{
                id: memory.id,
                type: 'memory',
                title: memory.caption,
                imageUrl: memory.mediaUrl
            }}
            currentUser={{ id: currentUserId } as any} // Pass partial user for now or fetch full user in parent
        />
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
        <button 
            onClick={() => setShowMenu(true)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-1"
        >
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
             <button onClick={() => onCommentClick?.(memory)} className="flex items-center gap-1.5 group">
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

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-12 right-4 z-50 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
            <div className="py-1">
                {currentUserId === memory.userId && (
                    <>
                    <button 
                        onClick={() => { setShowMenu(false); onEdit?.(memory); }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-2"
                    >
                        <Edit3 className="w-4 h-4" /> Edit
                    </button>
                    <button 
                         onClick={() => { setShowMenu(false); onDelete?.(memory); }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    </>
                )}
                 <button 
                    onClick={() => { setShowMenu(false); handleShare(); }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-2"
                >
                    <Copy className="w-4 h-4" /> Copy Link
                </button>
                 <button 
                    onClick={() => { setShowMenu(false); toast.info("Reported"); }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-2"
                >
                    <Flag className="w-4 h-4" /> Report
                </button>
                 <button 
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover border-t border-gray-100 dark:border-dark-border"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
    </div>
  );
};

export default MemoryCard;
