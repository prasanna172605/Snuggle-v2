import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Phone,
    Video,
    VideoOff,
    Mic,
    MicOff,
    Monitor,
    PhoneOff,
    UserPlus
} from 'lucide-react';
import { webrtcService } from '../services/webrtc';
import { DBService } from '../services/database';

interface Participant {
    userId: string;
    stream: MediaStream | null;
    username: string;
    avatar: string;
}

export default function CallScreen() {
    const { callId } = useParams<{ callId: string }>();
    const navigate = useNavigate();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [isConnecting, setIsConnecting] = useState(true);
    const [callType, setCallType] = useState<'audio' | 'video'>('video');

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
    const callStartTime = useRef<number>(0);

    useEffect(() => {
        if (!callId) {
            navigate('/messages');
            return;
        }

        initializeCall();

        return () => {
            cleanup();
        };
    }, [callId]);

    // Duration timer
    useEffect(() => {
        const interval = setInterval(() => {
            if (callStartTime.current > 0) {
                setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const initializeCall = async () => {
        try {
            // Get call data
            const callData = await DBService.getCall(callId!);
            if (!callData) {
                console.error('Call not found');
                navigate('/messages');
                return;
            }

            setCallType(callData.type);
            const currentUserId = localStorage.getItem('userId') || '';

            // Get user media
            const localStream = await webrtcService.getUserMedia(
                true,
                callData.type === 'video'
            );

            // Display local video
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
            }

            // Set up peer connections for each participant
            const otherParticipants = callData.participants.filter(
                (id: string) => id !== currentUserId
            );

            for (const participantId of otherParticipants) {
                await setupPeerConnection(participantId, callData.initiator === currentUserId);
            }

            // Listen for call signals
            DBService.listenToCallSignals(callId!, currentUserId, async (signals: any[]) => {
                for (const signal of signals) {
                    await handleSignal(signal);
                }
            });

            // Update call status to active
            if (callData.initiator === currentUserId) {
                await DBService.updateCallStatus(callId!, 'active');
            }

            callStartTime.current = Date.now();
            setIsConnecting(false);
        } catch (error) {
            console.error('Error initializing call:', error);
            alert('Failed to start call: ' + (error as Error).message);
            endCall();
        }
    };

    const setupPeerConnection = async (participantId: string, isInitiator: boolean) => {
        const currentUserId = localStorage.getItem('userId') || '';

        // Create peer connection
        const peerConnection = webrtcService.createPeerConnection(
            participantId,
            callId!,
            (remoteStream) => {
                // Add remote stream to participants
                setParticipants(prev => {
                    const existing = prev.find(p => p.userId === participantId);
                    if (existing) {
                        return prev.map(p =>
                            p.userId === participantId ? { ...p, stream: remoteStream } : p
                        );
                    }
                    return [...prev, {
                        userId: participantId,
                        stream: remoteStream,
                        username: 'User', // TODO: Fetch from DB
                        avatar: ''
                    }];
                });
            },
            async (candidate) => {
                // Save ICE candidate
                await DBService.saveIceCandidate(
                    callId!,
                    currentUserId,
                    participantId,
                    candidate.toJSON()
                );
            }
        );

        // If initiator, create and send offer
        if (isInitiator) {
            const offer = await webrtcService.createOffer(participantId);
            await DBService.saveCallOffer(callId!, currentUserId, participantId, offer);
        }
    };

    const handleSignal = async (signal: any) => {
        const currentUserId = localStorage.getItem('userId') || '';

        // Handle offer
        if (signal.offer && !signal.answer) {
            const answer = await webrtcService.createAnswer(signal.from, signal.offer);
            await DBService.saveCallAnswer(callId!, currentUserId, signal.from, answer);
        }

        // Handle answer
        if (signal.answer) {
            await webrtcService.handleAnswer(signal.from, signal.answer);
        }

        // Handle ICE candidates
        if (signal.iceCandidates && signal.iceCandidates.length > 0) {
            for (const candidate of signal.iceCandidates) {
                await webrtcService.addIceCandidate(signal.from, candidate);
            }
        }
    };

    const toggleAudio = () => {
        webrtcService.toggleAudio(!isAudioEnabled);
        setIsAudioEnabled(!isAudioEnabled);
    };

    const toggleVideo = () => {
        webrtcService.toggleVideo(!isVideoEnabled);
        setIsVideoEnabled(!isVideoEnabled);
    };

    const toggleScreenShare = async () => {
        try {
            if (isScreenSharing) {
                // Stop screen share, revert to camera
                // TODO: Implement revert logic
                setIsScreenSharing(false);
            } else {
                await webrtcService.shareScreen();
                setIsScreenSharing(true);
            }
        } catch (error) {
            console.error('Screen share error:', error);
        }
    };

    const endCall = async () => {
        try {
            // Update call status
            await DBService.updateCallStatus(callId!, 'ended');

            // Save call history
            const chatId = DBService.getChatId(
                localStorage.getItem('userId') || '',
                participants[0]?.userId || ''
            );

            await DBService.saveCallHistory(chatId, {
                type: callType,
                duration: callDuration,
                status: 'completed',
                participants: participants.map(p => p.userId)
            });

            cleanup();
            navigate('/messages');
        } catch (error) {
            console.error('Error ending call:', error);
            cleanup();
            navigate('/messages');
        }
    };

    const cleanup = () => {
        webrtcService.cleanup();
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-gray-900 z-50">
            {/* Remote Videos Grid */}
            <div className={`absolute inset-0 ${participants.length === 1 ? '' :
                participants.length === 2 ? 'grid grid-cols-2' :
                    participants.length === 3 ? 'grid grid-cols-2 grid-rows-2' :
                        'grid grid-cols-2 grid-rows-2'
                }`}>
                {participants.map((participant, index) => (
                    <div key={participant.userId} className="relative bg-gray-800 flex items-center justify-center">
                        {participant.stream ? (
                            <video
                                ref={(el) => {
                                    if (el && participant.stream) {
                                        el.srcObject = participant.stream;
                                        remoteVideosRef.current.set(participant.userId, el);
                                    }
                                }}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center text-white">
                                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                    <span className="text-3xl">{participant.username[0]?.toUpperCase()}</span>
                                </div>
                                <p className="text-lg">{participant.username}</p>
                            </div>
                        )}

                        {/* Participant Name Overlay */}
                        <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full">
                            <span className="text-white text-sm">{participant.username}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            {callType === 'video' && (
                <div className="absolute top-4 right-4 w-40 h-56 bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded-full">
                        <span className="text-white text-xs">You</span>
                    </div>
                </div>
            )}

            {/* Call Info Overlay */}
            <div className="absolute top-4 left-4 text-white">
                {isConnecting ? (
                    <div className="bg-orange-500/80 px-4 py-2 rounded-full">
                        <span>Connecting...</span>
                    </div>
                ) : (
                    <div className="bg-black/50 px-4 py-2 rounded-full">
                        <span>{formatDuration(callDuration)}</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
                {/* Microphone Toggle */}
                <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-full transition-all ${isAudioEnabled
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-red-500 hover:bg-red-600'
                        }`}
                >
                    {isAudioEnabled ? (
                        <Mic className="w-6 h-6 text-white" />
                    ) : (
                        <MicOff className="w-6 h-6 text-white" />
                    )}
                </button>

                {/* Video Toggle */}
                {callType === 'video' && (
                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all ${isVideoEnabled
                            ? 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-red-500 hover:bg-red-600'
                            }`}
                    >
                        {isVideoEnabled ? (
                            <Video className="w-6 h-6 text-white" />
                        ) : (
                            <VideoOff className="w-6 h-6 text-white" />
                        )}
                    </button>
                )}

                {/* Screen Share */}
                <button
                    onClick={toggleScreenShare}
                    className={`p-4 rounded-full transition-all ${isScreenSharing
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                >
                    <Monitor className="w-6 h-6 text-white" />
                </button>

                {/* End Call */}
                <button
                    onClick={endCall}
                    className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-all"
                >
                    <PhoneOff className="w-6 h-6 text-white" />
                </button>
            </div>
        </div>
    );
}
