import { Phone, Video, PhoneOutgoing, PhoneIncoming, PhoneMissed } from 'lucide-react';
import { CallType } from '../services/webrtc';

interface CallHistoryMessageProps {
    callType: CallType;
    duration?: number;
    status: 'completed' | 'missed' | 'declined';
    timestamp: number;
    onCallBack: () => void;
    isOutgoing: boolean; // Whether current user initiated the call
}

export default function CallHistoryMessage({
    callType,
    duration,
    status,
    timestamp,
    onCallBack,
    isOutgoing
}: CallHistoryMessageProps) {
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getCallIcon = () => {
        if (status === 'missed') {
            return <PhoneMissed className="w-4 h-4 text-red-500" />;
        }
        return isOutgoing ? (
            <PhoneOutgoing className="w-4 h-4 text-gray-400" />
        ) : (
            <PhoneIncoming className="w-4 h-4 text-green-500" />
        );
    };

    const getCallText = () => {
        const direction = isOutgoing ? 'Outgoing' : 'Incoming';
        const type = callType === 'video' ? 'Video' : 'Voice';

        if (status === 'missed') return 'Missed call';
        if (status === 'declined') return `${direction} call (declined)`;
        return `${direction} ${type.toLowerCase()} call`;
    };

    const getTextColor = () => {
        if (status === 'missed') return 'text-red-500';
        return 'text-gray-500 dark:text-gray-400';
    };

    return (
        <div className="flex items-center gap-3 py-2 px-1">
            {/* Call Direction Icon */}
            <div className="flex-shrink-0">
                {getCallIcon()}
            </div>

            {/* Call Info */}
            <div className="flex-1 min-w-0">
                <div className={`text-sm ${getTextColor()}`}>
                    {getCallText()}
                </div>
                {duration && duration > 0 && status === 'completed' && (
                    <div className="text-xs text-gray-400">
                        {formatDuration(duration)}
                    </div>
                )}
            </div>

            {/* Timestamp */}
            <span className="text-xs text-gray-400 flex-shrink-0">
                {formatTime(timestamp)}
            </span>

            {/* Call Back Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onCallBack();
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0"
                title="Call back"
            >
                {callType === 'video' ? (
                    <Video className="w-4 h-4 text-gray-500" />
                ) : (
                    <Phone className="w-4 h-4 text-gray-500" />
                )}
            </button>
        </div>
    );
}
