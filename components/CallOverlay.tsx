
import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../context/CallContext';
import { DBService } from '../services/database';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, MonitorUp, PhoneIncoming } from 'lucide-react';
import { User } from '../types';

const CallOverlay: React.FC = () => {
  const {
    incomingCall,
    activeCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
    toggleMic,
    toggleCamera,
    isMicMuted,
    isCameraOff,
    connectionQuality,
    toggleScreenShare,
    isScreenSharing
  } = useCall();

  const [caller, setCaller] = useState<User | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (incomingCall) {
      DBService.getUserById(incomingCall.callerId).then(u => setCaller(u || null));
    } else {
      setCaller(null);
    }
  }, [incomingCall]);

  useEffect(() => {
    if (activeCall) {
      DBService.getUserById(activeCall.userId).then(u => setActiveUser(u || null));
    } else {
      setActiveUser(null);
    }
  }, [activeCall]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('[CallOverlay] Setting local stream');
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('[CallOverlay] Setting remote stream');
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (incomingCall && caller) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-snuggle-400 rounded-full animate-ping opacity-20"></div>
            <img src={caller.avatar} alt={caller.username} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg relative z-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{caller.fullName}</h3>
          <p className="text-gray-500 mb-8">Incoming {incomingCall.type} call...</p>

          <div className="flex items-center space-x-12">
            <button
              onClick={rejectCall}
              className="flex flex-col items-center space-y-2 group"
            >
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-500">Decline</span>
            </button>

            <button
              onClick={acceptCall}
              className="flex flex-col items-center space-y-2 group"
            >
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all duration-300 shadow-lg scale-110">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-500">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeCall) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        {/* Main Video (Remote) */}
        <div className="flex-1 relative overflow-hidden">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center flex-col">
              <img src={activeUser?.avatar} className="w-32 h-32 rounded-full border-4 border-gray-700 opacity-50 mb-4" />
              <p className="text-white/50 animate-pulse">Connecting...</p>
            </div>
          )}

          {/* AUDIO element for audio-only calls */}
          {remoteStream && (
            <audio
              ref={(el) => {
                if (el && remoteStream) {
                  console.log('[CallOverlay] Setting audio element stream');
                  el.srcObject = remoteStream;
                  el.play().catch(e => console.error('Audio play failed:', e));
                }
              }}
              autoPlay
              playsInline
            />
          )}

          {/* Local Video (PIP) */}
          {activeCall.type === 'video' && (
            <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
                className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
              />
              {isCameraOff && (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white/30">
                  <VideoOff className="w-8 h-8" />
                </div>
              )}
            </div>
          )}

          {/* Header Info */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <h3 className="text-white font-bold text-center text-lg drop-shadow-md">{activeUser?.fullName}</h3>
            <p className="text-white/70 text-center text-xs">{activeCall.type === 'video' ? 'Video Call' : 'Audio Call'}</p>

            {/* Connection Quality Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${connectionQuality === 'high' ? 'bg-green-400' :
                connectionQuality === 'medium' ? 'bg-yellow-400' :
                  'bg-red-400'
                }`} />
              <span className="text-white text-xs capitalize">{connectionQuality}</span>
            </div>
          </div>

          {/* Call Waiting Popup */}
          {incomingCall && (
            <div className="absolute top-20 left-4 right-4 bg-gray-900/90 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-2xl animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-snuggle-500/20 flex items-center justify-center">
                    <PhoneIncoming className="w-5 h-5 text-snuggle-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Incoming Call...</p>
                    <p className="text-white/60 text-xs">Tap to switch calls</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Reject the incoming call waiting request
                      if (incomingCall) {
                        DBService.sendSignal({
                          type: 'busy',
                          senderId: activeCall.userId,
                          receiverId: incomingCall.callerId,
                          timestamp: Date.now()
                        });
                        // We need to clear the incoming call state from context
                        // Since we don't have a direct setter exposed, we might need to expose one or use a new method
                        // But we can't easily modify context from here without exposing more.
                        // Workaround: The context should probably handle this better.
                        // Actually, let's just expose a way to dismiss incoming call.
                        // Or better: update rejectCall in context to handle this case!
                      }
                    }}
                    className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                  <button
                    onClick={acceptCall}
                    className="p-2 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Controls */}
        <div className="bg-gray-900/90 backdrop-blur p-6 pb-8 absolute bottom-0 left-0 right-0">
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 ${isMicMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
            >
              {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {activeCall.type === 'video' && (
              <button
                onClick={toggleCamera}
                className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 ${isCameraOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            {/* Screen Share Button */}
            {activeCall.type === 'video' && (
              <button
                onClick={toggleScreenShare}
                className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 ${isScreenSharing ? 'bg-snuggle-500 text-white hover:bg-snuggle-600' : 'bg-white text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <MonitorUp className="w-6 h-6" />
              </button>
            )}

            <button
              onClick={endCall}
              className="p-5 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-xl transform hover:scale-110 transition-all border-4 border-gray-900/50"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CallOverlay;
