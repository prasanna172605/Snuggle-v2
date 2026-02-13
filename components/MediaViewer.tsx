import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Forward, Copy, Share2, ZoomIn, ZoomOut, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface MediaViewerProps {
    isOpen: boolean;
    onClose: () => void;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    senderName?: string;
    timestamp?: number;
    onForward?: () => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
    isOpen,
    onClose,
    mediaUrl,
    mediaType,
    senderName,
    timestamp,
    onForward,
}) => {
    const [scale, setScale] = useState(1);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setIsVideoPlaying(false);
        }
    }, [isOpen]);

    // Handle keyboard events
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.5, 4));
            if (e.key === '-') setScale(s => Math.max(s - 0.5, 0.5));
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleDownload = async () => {
        try {
            toast.loading('Downloading...');
            const response = await fetch(mediaUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `media_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            toast.dismiss();
            toast.success('Downloaded!');
        } catch (err) {
            toast.dismiss();
            toast.error('Download failed');
            console.error('Download error:', err);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(mediaUrl);
            toast.success('Link copied!');
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ url: mediaUrl, title: 'Shared media' });
            } catch { /* user cancelled */ }
        } else {
            handleCopyLink();
        }
    };

    const formatTime = (ts: number) => {
        const date = new Date(ts);
        return date.toLocaleString([], {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const toggleVideoPlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsVideoPlaying(true);
        } else {
            videoRef.current.pause();
            setIsVideoPlaying(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] bg-black flex flex-col"
                    onClick={onClose}
                >
                    {/* Top Bar */}
                    <motion.div
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 z-10"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                        <div className="text-center">
                            {senderName && (
                                <p className="text-white font-semibold text-sm">{senderName}</p>
                            )}
                            {timestamp && (
                                <p className="text-gray-400 text-xs">{formatTime(timestamp)}</p>
                            )}
                        </div>
                        {/* Zoom controls (image only) */}
                        {mediaType === 'image' ? (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setScale(s => Math.max(s - 0.5, 0.5))}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <ZoomOut className="w-5 h-5 text-white" />
                                </button>
                                <button
                                    onClick={() => setScale(s => Math.min(s + 0.5, 4))}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <ZoomIn className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        ) : <div className="w-20" />}
                    </motion.div>

                    {/* Media Content */}
                    <div
                        className="flex-1 flex items-center justify-center overflow-hidden"
                        onClick={e => {
                            if (mediaType === 'video') {
                                e.stopPropagation();
                                toggleVideoPlay();
                            }
                        }}
                    >
                        {mediaType === 'image' ? (
                            <motion.img
                                src={mediaUrl}
                                alt="Media preview"
                                className="max-w-full max-h-full object-contain select-none"
                                style={{ transform: `scale(${scale})` }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                onClick={e => e.stopPropagation()}
                                draggable={false}
                            />
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                                <video
                                    ref={videoRef}
                                    src={mediaUrl}
                                    className="max-w-full max-h-full object-contain"
                                    controls
                                    controlsList="nodownload"
                                    playsInline
                                    onPlay={() => setIsVideoPlaying(true)}
                                    onPause={() => setIsVideoPlaying(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Bar */}
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center justify-center gap-8 px-6 py-4 bg-black/80 backdrop-blur-md border-t border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={handleDownload}
                            className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                        >
                            <Download className="w-6 h-6" />
                            <span className="text-[10px] font-medium">Save</span>
                        </button>

                        {onForward && (
                            <button
                                onClick={onForward}
                                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                            >
                                <Forward className="w-6 h-6" />
                                <span className="text-[10px] font-medium">Forward</span>
                            </button>
                        )}

                        <button
                            onClick={handleCopyLink}
                            className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                        >
                            <Copy className="w-6 h-6" />
                            <span className="text-[10px] font-medium">Copy Link</span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
                        >
                            <Share2 className="w-6 h-6" />
                            <span className="text-[10px] font-medium">Share</span>
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MediaViewer;
