import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Heart, Send, Eye, ChevronLeft, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { Moment, User } from '../../types';
import { MomentService } from '../../services/momentService';
import { DBService } from '../../services/database';

interface MomentViewerProps {
  /** Grouped moments: array of { user, moments[] } in feed order */
  feed: { user: User; moments: Moment[] }[];
  initialUserIndex: number;
  currentUserId: string;
  onClose: () => void;
  onReply: (moment: Moment, userId: string) => void;
}

const STORY_DURATION = 30000; // 30s for images

const MomentViewer: React.FC<MomentViewerProps> = ({ feed, initialUserIndex, currentUserId, onClose, onReply }) => {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [momentIndex, setMomentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [viewerUser, setViewerUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentFeed = feed[userIndex];
  const currentMoment = currentFeed?.moments?.[momentIndex];
  const isOwnMoment = currentMoment?.userId === currentUserId;

  // Load user info
  useEffect(() => {
    if (currentFeed?.user) {
      setViewerUser(currentFeed.user);
    }
  }, [currentFeed]);

  // Check if liked
  useEffect(() => {
    if (!currentMoment) return;
    MomentService.isLiked(currentMoment.id, currentUserId).then(setLiked).catch(() => {});
  }, [currentMoment, currentUserId]);

  // Record view
  useEffect(() => {
    if (!currentMoment || isOwnMoment) return;
    MomentService.recordView(currentMoment.id, currentUserId).catch(() => {});
  }, [currentMoment, currentUserId, isOwnMoment]);

  // ---- Timer logic ----
  const startTimer = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    startTimeRef.current = performance.now() - (progress * STORY_DURATION);

    const tick = () => {
      if (paused) return;
      const elapsed = performance.now() - startTimeRef.current;
      const pct = Math.min(elapsed / STORY_DURATION, 1);
      setProgress(pct);

      if (pct >= 1) {
        goNext();
        return;
      }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
  }, [paused, progress]);

  useEffect(() => {
    if (!currentMoment) return;
    if (currentMoment.type === 'video' && videoRef.current) {
      // Video: use video duration
      return;
    }
    setProgress(0);
    startTimeRef.current = performance.now();
    startTimer();

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [userIndex, momentIndex, currentMoment?.id]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    } else {
      startTimer();
    }
  }, [paused]);

  // Video progress tracking
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = videoRef.current.currentTime / (videoRef.current.duration || 1);
    setProgress(pct);
  };

  const handleVideoEnded = () => {
    goNext();
  };

  // ---- Navigation ----
  const goNext = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    if (momentIndex < (currentFeed?.moments?.length ?? 0) - 1) {
      setMomentIndex(prev => prev + 1);
      setProgress(0);
    } else if (userIndex < feed.length - 1) {
      setUserIndex(prev => prev + 1);
      setMomentIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [momentIndex, userIndex, currentFeed, feed.length, onClose]);

  const goPrev = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    if (momentIndex > 0) {
      setMomentIndex(prev => prev - 1);
      setProgress(0);
    } else if (userIndex > 0) {
      setUserIndex(prev => prev - 1);
      const prevFeed = feed[userIndex - 1];
      setMomentIndex((prevFeed?.moments?.length ?? 1) - 1);
      setProgress(0);
    }
  }, [momentIndex, userIndex, feed]);

  // ---- Tap handlers ----
  const handleTap = (e: React.MouseEvent) => {
    if (showReply) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      goPrev();
    } else {
      goNext();
    }
  };

  // ---- Hold to pause ----
  const handlePointerDown = () => setPaused(true);
  const handlePointerUp = () => setPaused(false);

  // ---- Swipe down to close ----
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  // ---- Like ----
  const handleLike = async () => {
    if (!currentMoment) return;
    const result = await MomentService.toggleLike(currentMoment.id, currentUserId);
    setLiked(result);
    if (result) {
      setShowLikeAnim(true);
      setTimeout(() => setShowLikeAnim(false), 1000);
    }
  };

  // ---- Reply ----
  const handleSendReply = () => {
    if (!replyText.trim() || !currentMoment) return;
    onReply(currentMoment, currentMoment.userId);
    setReplyText('');
    setShowReply(false);
  };

  // ---- Delete (own moments) ----
  const handleDelete = async () => {
    if (!currentMoment) return;
    await MomentService.deleteMoment(currentMoment.id);
    setShowMenu(false);
    goNext();
  };

  // ---- Time ago ----
  const timeAgo = (ts: any): string => {
    if (!ts) return '';
    const ms = ts.toMillis ? ts.toMillis() : ts;
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  if (!currentMoment || !currentFeed) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
    >
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-safe pt-2">
        {currentFeed.moments.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < momentIndex ? '100%' : i === momentIndex ? `${progress * 100}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* User Header */}
      <div className="absolute top-6 left-0 right-0 z-30 flex items-center justify-between px-4 pt-safe">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30">
            {viewerUser?.avatar ? (
              <img src={viewerUser.avatar} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold">
                {(viewerUser?.username || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{viewerUser?.fullName || viewerUser?.username}</p>
            <p className="text-white/60 text-xs">{timeAgo(currentMoment.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwnMoment && (
            <button onClick={() => setShowMenu(!showMenu)} className="p-2">
              <MoreHorizontal className="w-5 h-5 text-white" />
            </button>
          )}
          <button onClick={onClose} className="p-2">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Own Moment Menu */}
      <AnimatePresence>
        {showMenu && isOwnMoment && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 right-4 z-40 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
          >
            <button
              onClick={() => { MomentService.getViewers(currentMoment.id); }}
              className="flex items-center gap-3 px-5 py-3 text-white text-sm w-full hover:bg-white/5"
            >
              <Eye className="w-4 h-4" /> Views ({currentMoment.viewCount})
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-3 px-5 py-3 text-red-400 text-sm w-full hover:bg-white/5"
            >
              <Trash2 className="w-4 h-4" /> Delete Moment
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div
        className="flex-1 relative flex items-center justify-center"
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {currentMoment.type === 'text' ? (
          <div className="px-8 text-center">
            <p className="text-white text-3xl font-bold leading-relaxed">{currentMoment.textOverlay}</p>
          </div>
        ) : currentMoment.type === 'video' ? (
          <video
            ref={videoRef}
            src={currentMoment.mediaUrl}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
          />
        ) : (
          <img
            src={currentMoment.mediaUrl || currentMoment.thumbnailUrl}
            className="w-full h-full object-contain"
          />
        )}

        {/* Text overlay */}
        {currentMoment.textOverlay && currentMoment.type !== 'text' && (
          <div className="absolute bottom-32 left-0 right-0 px-6 text-center">
            <p className="text-white text-lg font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
              {currentMoment.textOverlay}
            </p>
          </div>
        )}

        {/* Like Animation */}
        <AnimatePresence>
          {showLikeAnim && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute pointer-events-none"
            >
              <Heart className="w-24 h-24 text-red-500 fill-red-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      {!isOwnMoment && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-safe">
          {showReply ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Send a reply..."
                className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/40 focus:outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSendReply()}
              />
              <button onClick={handleSendReply} className="p-2.5 bg-white/10 backdrop-blur rounded-full">
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowReply(true)}
                className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-white/50 text-sm text-left"
              >
                Reply to moment...
              </button>
              <button onClick={handleLike} className="p-3 ml-2">
                <Heart className={`w-7 h-7 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Own: view count */}
      {isOwnMoment && (
        <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center pb-safe">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
            <Eye className="w-4 h-4 text-white/60" />
            <span className="text-white/80 text-sm font-medium">{currentMoment.viewCount} views</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MomentViewer;
