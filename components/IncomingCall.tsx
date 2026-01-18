import { Phone, Video, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface IncomingCallProps {
    callerName: string;
    callerAvatar: string;
    callType: 'audio' | 'video';
    onAccept: () => void;
    onDecline: () => void;
}

export default function IncomingCall({
    callerName,
    callerAvatar,
    callType,
    onAccept,
    onDecline
}: IncomingCallProps) {
    const [ringing, setRinging] = useState(true);

    useEffect(() => {
        // Auto-decline after 30 seconds
        const timeout = setTimeout(() => {
            onDecline();
        }, 30000);

        // Play ringing sound (optional - can add audio element)
        // const audio = new Audio('/ringtone.mp3');
        // audio.loop = true;
        // audio.play();

        return () => {
            clearTimeout(timeout);
            // audio.pause();
        };
    }, [onDecline]);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center animate-fade-in">
            {/* Caller Info */}
            <div className="flex flex-col items-center text-white">
                {/* Avatar */}
                <div className="relative mb-6">
                    <img
                        src={callerAvatar || '/default-avatar.png'}
                        alt={callerName}
                        className="w-32 h-32 rounded-full object-cover ring-4 ring-white/20"
                    />
                    {/* Ringing animation */}
                    <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                </div>

                {/* Caller Name */}
                <h2 className="text-3xl font-semibold mb-2">{callerName}</h2>

                {/* Call Type */}
                <div className="flex items-center gap-2 text-gray-300 mb-8">
                    {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                    <span className="text-lg">Incoming {callType} call...</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-8 mt-12">
                    {/* Decline Button */}
                    <button
                        onClick={onDecline}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all transform group-hover:scale-110">
                            <X className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-sm text-gray-400">Decline</span>
                    </button>

                    {/* Accept Button */}
                    <button
                        onClick={onAccept}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-all transform group-hover:scale-110 animate-pulse">
                            {callType === 'video' ? (
                                <Video className="w-8 h-8 text-white" />
                            ) : (
                                <Phone className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <span className="text-sm text-gray-400">Accept</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
