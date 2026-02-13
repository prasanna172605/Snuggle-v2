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

    const getCallText = () => {
        if (status === 'missed') return isOutgoing ? 'No answer' : 'Missed call';
        if (status === 'declined') return 'Call declined';

        // Active/Ended
        if (isOutgoing) {
            return `You started a ${callType} call`;
        } else {
            return `Incoming ${callType} call`;
        }
    };

    const isMissed = status === 'missed' || status === 'declined';

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl min-w-[200px] max-w-[280px] border ${isOutgoing
            ? 'bg-accent-50 dark:bg-accent-900/30 border-accent-200 dark:border-accent-800/50'
            : 'bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border'}`}>

            {/* Icon Container */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMissed ? 'bg-red-100 dark:bg-red-900/20' : 'bg-accent-100 dark:bg-accent-900/20'}`}>
                {status === 'missed' ? (
                    <PhoneMissed className="w-5 h-5 text-red-500" />
                ) : callType === 'video' ? (
                    <Video className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                ) : (
                    <Phone className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${isMissed ? 'text-red-500' : 'text-black dark:text-white'}`}>
                    {getCallText()}
                </p>
                {duration && duration > 0 && status === 'completed' ? (
                    <p className="text-sm font-semibold text-black dark:text-white">
                        {formatDuration(duration)}
                    </p>
                ) : (
                    <p className="text-xs text-gray-400">{formatTime(timestamp)}</p>
                )}
            </div>

            {/* Call Back Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onCallBack();
                }}
                className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                title="Call back"
            >
                {callType === 'video' ? (
                    <Video className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                ) : (
                    <Phone className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                )}
            </button>
        </div>
    );
}
