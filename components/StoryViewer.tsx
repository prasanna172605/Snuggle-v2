
import React, { useState, useEffect, useRef } from 'react';
import { User, Story } from '../types';
import { X, MoreHorizontal } from 'lucide-react';

interface StoryViewerProps {
    stories: Story[];
    user: User;
    onClose: () => void;
    onNextUser?: () => void;
    onPrevUser?: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, user, onClose, onNextUser, onPrevUser }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressInterval = useRef<any>(null);

    const currentStory = stories[currentIndex];
    const isVideo = currentStory?.imageUrl.startsWith('data:video');
    const DURATION = 5000; // 5 seconds per story image
    const UPDATE_INTERVAL = 50;

    useEffect(() => {
        setProgress(0);
    }, [currentIndex]);

    useEffect(() => {
        if (isPaused) return;

        // If video, we let the video timeupdate handle progress (optional), 
        // or just use a fixed timer for images.
        if (isVideo) {
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(e => console.log("Autoplay failed", e));
            }
            // For video, we rely on onEnded to advance
            return;
        }

        const step = 100 / (DURATION / UPDATE_INTERVAL);
        progressInterval.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, UPDATE_INTERVAL);

        return () => clearInterval(progressInterval.current);
    }, [currentIndex, isPaused, isVideo]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // End of this user's stories
            if (onNextUser) {
                onNextUser();
            } else {
                onClose();
            }
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            if (onPrevUser) {
                onPrevUser();
            } else {
                // Stay on first story or close? Usually restart first story
                setProgress(0);
            }
        }
    };

    const handleVideoEnded = () => {
        handleNext();
    };

    const handleTouchStart = () => setIsPaused(true);
    const handleTouchEnd = () => setIsPaused(false);

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
            {/* Story Content */}
            <div
                className="relative w-full h-full max-w-md bg-gray-900"
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {isVideo ? (
                    <video
                        ref={videoRef}
                        src={currentStory.imageUrl}
                        className="w-full h-full object-contain"
                        onEnded={handleVideoEnded}
                        playsInline
                    />
                ) : (
                    <img
                        src={currentStory.imageUrl}
                        alt="Story"
                        className="w-full h-full object-contain"
                    />
                )}

                {/* Overlays */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
                    {/* Progress Bars */}
                    <div className="flex gap-1 mb-3">
                        {stories.map((_, idx) => (
                            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-100 ease-linear"
                                    style={{
                                        width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={user.avatar} className="w-8 h-8 rounded-full border border-white/50" alt="" />
                            <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{user.username}</span>
                            <span className="text-white/70 text-xs">{new Date(currentStory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="text-white/80">
                                <MoreHorizontal className="w-6 h-6" />
                            </button>
                            <button onClick={onClose} className="text-white">
                                <X className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation Tap Zones */}
                <div className="absolute inset-0 flex z-10">
                    <div className="w-[30%] h-full" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                    <div className="w-[70%] h-full" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
                </div>
            </div>
        </div>
    );
};

export default StoryViewer;
