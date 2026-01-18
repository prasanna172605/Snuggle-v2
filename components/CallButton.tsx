import { Phone, Video } from 'lucide-react';
import { useState } from 'react';

interface CallButtonProps {
    onAudioCall: () => void;
    onVideoCall: () => void;
    disabled?: boolean;
}

export default function CallButton({ onAudioCall, onVideoCall, disabled = false }: CallButtonProps) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="relative">
            {/* Audio Call Button */}
            <button
                onClick={onAudioCall}
                disabled={disabled}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Audio Call"
            >
                <Phone className="w-5 h-5" />
            </button>

            {/* Video Call Button */}
            <button
                onClick={onVideoCall}
                disabled={disabled}
                className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Video Call"
            >
                <Video className="w-5 h-5" />
            </button>
        </div>
    );
}
