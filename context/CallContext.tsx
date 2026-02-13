
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, SignalingMessage, CallType } from '../types';
import { DBService } from '../services/database';
import { getSafetyNumber, isE2EEReady } from '../services/keyManager';
import { playRingback, playIncomingRing, playConnectedTone, playEndedTone, stopAll as stopCallAudio } from '../services/callAudio';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

interface CallContextType {
  isInCall: boolean;
  callState: CallState;
  incomingCall: { callerId: string; type: CallType } | null;
  activeCall: { userId: string; type: CallType } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionQuality: 'high' | 'medium' | 'low';
  securityCode: string | null;
  startCall: (receiverId: string, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode; currentUser: User | null }> = ({ children, currentUser }) => {
  const [incomingCall, setIncomingCall] = useState<{ callerId: string; type: CallType } | null>(null);
  const [activeCall, setActiveCall] = useState<{ userId: string; type: CallType } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [securityCode, setSecurityCode] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>('idle');

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callStartTime = useRef<number>(0);
  const callInitiator = useRef<string>(''); // Track who initiated the call
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const qualityMonitorInterval = useRef<NodeJS.Timeout | null>(null);
  const remoteUserIdRef = useRef<string>(''); // Track remote user ID synchronously for ICE candidates
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 30s call timeout
  const callRecordStartTime = useRef<number>(0); // When the call attempt started (for records)

  // Generate unique device ID to prevent multi-device conflicts
  const deviceId = useRef<string>(
    localStorage.getItem('snuggle_device_id') ||
    (() => {
      const id = crypto.randomUUID();
      localStorage.setItem('snuggle_device_id', id);
      return id;
    })()
  );




  const servers = {
    iceServers: [
      // Google STUN servers
      {
        urls: 'stun:stun.l.google.com:19302',
      },
      // Multiple free TURN servers for redundancy
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelay',
        credential: 'openrelay',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelay',
        credential: 'openrelay',
      },
      {
        urls: 'turn:relay1.expressturn.com:3478',
        username: 'efF8BXPVVQ2PZLF2JY',
        credential: 'kHQt4nGYvmPTXdMz',
      },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    if (!currentUser?.id) {
      console.log('[CallContext] No currentUser.id yet, skipping signal subscription');
      return;
    }

    console.log('[CallContext] Subscribing to Firestore signals for:', currentUser.id);
    const unsubscribe = DBService.subscribeToSignals(currentUser.id, (signal) => {
      console.log('[CallContext] Received signal:', signal.type);
      handleSignalMessage(signal);
    });

    return () => {
      console.log('[CallContext] Unsubscribing from signals');
      unsubscribe();
    };
  }, [currentUser]);

  const createPeerConnection = () => {
    if (peerConnection.current) return peerConnection.current;

    const pc = new RTCPeerConnection(servers);

    pc.onicecandidate = (event) => {
      // Use ref instead of state to ensure we have the receiver ID immediately
      if (event.candidate && remoteUserIdRef.current && currentUser) {
        console.log('[WebRTC] Sending ICE candidate to:', remoteUserIdRef.current);
        DBService.sendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          senderId: currentUser.id,
          receiverId: remoteUserIdRef.current,
          timestamp: Date.now(),
        });
      } else if (event.candidate) {
        console.warn('[WebRTC] ICE candidate generated but no remoteUserIdRef:', remoteUserIdRef.current);
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] ontrack fired:', event.track.kind, 'enabled:', event.track.enabled);
      console.log('[WebRTC] event.streams:', event.streams?.length);

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        console.log('[WebRTC] Setting remote stream with', stream.getTracks().length, 'tracks');

        // CRITICAL: Set the stream immediately
        setRemoteStream(stream);

        // Ensure tracks are enabled
        stream.getTracks().forEach(track => {
          console.log(`[WebRTC] Track ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`);
          if (!track.enabled) {
            track.enabled = true;
            console.log(`[WebRTC] Force-enabled ${track.kind} track`);
          }
        });
      } else {
        console.error('[WebRTC] ❌ ontrack fired but no streams! event:', event);
      }

      // Force a state update to ensure React re-renders
      console.log('[WebRTC] Current remoteStream state after ontrack:', remoteStream ? 'EXISTS' : 'NULL');
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] 🔌 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC] ✅ CONNECTED! Media should flow now');
        startQualityMonitoring();
        if (callStartTime.current === 0) {
          callStartTime.current = Date.now();
        }
        // Clear timeout & stop ringtones on connection
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        stopCallAudio();
        playConnectedTone();
        setCallState('connected');
        console.log('[CallState] → connected');
        // Generate E2EE safety number for call verification
        if (isE2EEReady() && remoteUserIdRef.current) {
          getSafetyNumber(remoteUserIdRef.current).then(code => {
            if (code) {
              setSecurityCode(code);
              console.log('[E2EE] Call security code generated');
            }
          }).catch(e => console.warn('[E2EE] Safety number generation failed:', e));
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.error('[WebRTC] ❌ Connection FAILED or DISCONNECTED');
        stopQualityMonitoring();
        endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] 🧊 ICE connection state:', pc.iceConnectionState);
    };

    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] 📡 ICE gathering state:', pc.iceGatheringState);
    };

    peerConnection.current = pc;
    return pc;
  };

  // Monitor connection quality and adjust bitrate
  const monitorConnectionQuality = async () => {
    const pc = peerConnection.current;
    if (!pc) return;

    try {
      const stats = await pc.getStats();
      let bytesReceived = 0;
      let packetsLost = 0;
      let packetsReceived = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          bytesReceived = report.bytesReceived || 0;
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
        }
      });

      // Calculate packet loss percentage
      const totalPackets = packetsLost + packetsReceived;
      const packetLossPercentage = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

      // Determine quality based on packet loss
      let newQuality: 'high' | 'medium' | 'low' = 'high';
      if (packetLossPercentage > 10) {
        newQuality = 'low';
      } else if (packetLossPercentage > 3) {
        newQuality = 'medium';
      }

      // Update quality if changed
      if (newQuality !== connectionQuality) {
        console.log('[Quality] Adjusting from', connectionQuality, 'to', newQuality, 'Packet loss:', packetLossPercentage.toFixed(2) + '%');
        setConnectionQuality(newQuality);
        adjustBitrate(pc, newQuality);
      }
    } catch (error) {
      console.error('[Quality] Error monitoring:', error);
    }
  };

  // Adjust video bitrate based on quality
  const adjustBitrate = async (pc: RTCPeerConnection, quality: 'high' | 'medium' | 'low') => {
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;

    try {
      const parameters = sender.getParameters();
      if (!parameters.encodings || parameters.encodings.length === 0) {
        parameters.encodings = [{}];
      }

      // Set bitrate based on quality
      switch (quality) {
        case 'high':
          parameters.encodings[0].maxBitrate = 1500000; // 1.5 Mbps
          break;
        case 'medium':
          parameters.encodings[0].maxBitrate = 500000; // 500 Kbps
          break;
        case 'low':
          parameters.encodings[0].maxBitrate = 150000; // 150 Kbps
          break;
      }

      await sender.setParameters(parameters);
      console.log('[Quality] Bitrate adjusted to', quality);
    } catch (error) {
      console.error('[Quality] Error adjusting bitrate:', error);
    }
  };

  // Start quality monitoring
  function startQualityMonitoring() {
    stopQualityMonitoring(); // Clear any existing interval
    qualityMonitorInterval.current = setInterval(monitorConnectionQuality, 2000); // Check every 2 seconds
    console.log('[Quality] Monitoring started');
  }
  // Stop quality monitoring
  function stopQualityMonitoring() {
    if (qualityMonitorInterval.current) {
      clearInterval(qualityMonitorInterval.current);
      qualityMonitorInterval.current = null;
      console.log('[Quality] Monitoring stopped');
    }
  }

  // HD media constraints
  const getMediaConstraints = (type: CallType): MediaStreamConstraints => ({
    video: type === 'video' ? {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    } : false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const startCall = async (receiverId: string, type: CallType) => {
    if (!currentUser) return;
    callStartTime.current = 0; // Reset timer
    callRecordStartTime.current = Date.now();
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(type));
      setLocalStream(stream);
      setIsCameraOff(type === 'audio');

      setActiveCall({ userId: receiverId, type });
      setCallState('calling');
      console.log('[CallState] → calling');

      // Play ringback tone for caller
      playRingback();

      // Set ref BEFORE creating peer connection so ICE candidates know where to go
      remoteUserIdRef.current = receiverId;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Set initiator BEFORE sending offer
      callInitiator.current = currentUser.id;

      DBService.sendSignal({
        type: 'offer',
        sdp: offer,
        senderId: currentUser.id,
        receiverId: receiverId,
        callType: type,
        deviceId: deviceId.current,
        timestamp: Date.now(),
      });

      // Save call record as "calling"
      DBService.saveCallRecord({
        callerId: currentUser.id,
        receiverId,
        type,
        status: 'calling',
        startedAt: callRecordStartTime.current,
      }).catch(e => console.warn('[CallRecord] Save failed:', e));

      // ─── 30-second timeout ───────────────────────────────────
      callTimeoutRef.current = setTimeout(() => {
        console.log('[CallTimeout] 30s elapsed — marking as missed');
        if (callState === 'calling' || callState === 'ringing') {
          // Stop ringtone
          stopCallAudio();

          // Send end signal
          DBService.sendSignal({
            type: 'end',
            senderId: currentUser!.id,
            receiverId,
            timestamp: Date.now(),
          });

          // Save as missed call in chat history
          const chatId = [currentUser!.id, receiverId].sort().join('_');
          DBService.saveCallHistory(chatId, {
            type,
            duration: 0,
            status: 'missed',
            participants: [currentUser!.id, receiverId],
            callerId: currentUser!.id,
          }).catch(e => console.error('[CallHistory] Missed save error:', e));

          // Save call record as missed
          DBService.saveCallRecord({
            callerId: currentUser!.id,
            receiverId,
            type,
            status: 'missed',
            startedAt: callRecordStartTime.current,
            endedAt: Date.now(),
            duration: 0,
          }).catch(e => console.warn('[CallRecord] Missed save error:', e));

          setCallState('ended');
          cleanupCall();
        }
      }, 30000);

      // Send Push Notification
      const senderName = currentUser.fullName || "Incoming Call";
      DBService.sendPushNotification({
        receiverId: receiverId,
        title: senderName,
        body: `Incoming ${type} call...`,
        url: '/call',
        icon: currentUser.avatar,
        type: 'call'
      });
    } catch (err) {
      console.error('Error starting call:', err);
      setCallState('idle');
      alert('Could not access camera/microphone');
    }
  };

  const handleSignalMessage = async (data: SignalingMessage) => {
    if (!currentUser) return;

    if (data.type === 'offer') {
      // Allow incoming call even if in a call (Call Waiting)
      const caller = await DBService.getUserById(data.senderId);
      if (caller) {
        setIncomingCall({
          callerId: data.senderId,
          type: data.callType || 'audio'
        });
        (window as any).pendingOffer = data.sdp;
        // Play incoming ringtone
        if (!activeCall) {
          setCallState('ringing');
          playIncomingRing();
          console.log('[CallState] → ringing');
        }
      }
    } else if (data.type === 'answer') {
      if (peerConnection.current && data.sdp) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        // Process queued candidates
        iceCandidatesQueue.current.forEach(async candidate => {
          await peerConnection.current?.addIceCandidate(candidate);
        });
        iceCandidatesQueue.current = [];
      }
    } else if (data.type === 'candidate') {
      if (peerConnection.current && data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate);
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(candidate);
        } else {
          iceCandidatesQueue.current.push(data.candidate);
        }
      }
    } else if (data.type === 'answered_elsewhere') {
      // Another device answered the call, dismiss UI on this device
      if (data.deviceId !== deviceId.current && incomingCall) {
        console.log('[CallContext] Call answered on another device, dismissing');
        setIncomingCall(null);
      }
    } else if (data.type === 'end' || data.type === 'reject' || data.type === 'busy') {
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !currentUser) return;

    // If already in a call, end it first (Call Waiting - End & Accept)
    if (activeCall) {
      console.log('[CallContext] Ending current call to accept new one');

      const savedIncomingCall = { ...incomingCall };
      const savedOffer = (window as any).pendingOffer;

      // 1. Notify current active peer that the call is ending
      if (activeCall.userId) {
        DBService.sendSignal({
          type: 'end',
          senderId: currentUser.id,
          receiverId: activeCall.userId,
          timestamp: Date.now(),
        });

        // 2. Save history for the ended call
        const chatId = [currentUser.id, activeCall.userId].sort().join('_');
        await DBService.saveCallHistory(chatId, {
          type: activeCall.type,
          duration: callStartTime.current > 0 ? Math.round((Date.now() - callStartTime.current) / 1000) : 0,
          status: 'completed',
          participants: [currentUser.id, activeCall.userId],
          callerId: callInitiator.current
        });
      }

      // 3. Manually cleanup current call without clearing incomingCall
      stopQualityMonitoring();
      localStream?.getTracks().forEach(track => track.stop());
      remoteStream?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
      peerConnection.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
      setIsMicMuted(false);
      setIsCameraOff(false);
      setIsScreenSharing(false); // Ensure screen sharing state is reset
      setConnectionQuality('high');
      callStartTime.current = 0;
      callInitiator.current = '';

      // Now proceed to accept the saved incoming call
      const callerId = savedIncomingCall.callerId;
      const type = savedIncomingCall.type;
      (window as any).pendingOffer = savedOffer; // Restore pending offer for the new call

      try {
        const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(type));
        setLocalStream(stream);
        setIsCameraOff(type === 'audio'); // Set camera off if it's an audio call

        callStartTime.current = Date.now();
        callInitiator.current = callerId;

        setIncomingCall(null); // NOW we clear incoming call as we are making it active
        setActiveCall({ userId: callerId, type });

        // Set ref BEFORE creating peer connection so ICE candidates know where to go
        remoteUserIdRef.current = callerId;

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = (window as any).pendingOffer;
        if (offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          DBService.sendSignal({
            type: 'answer',
            sdp: answer,
            senderId: currentUser.id,
            receiverId: callerId,
            answeringDeviceId: deviceId.current,
            timestamp: Date.now(),
          });

          // Notify other devices that call was answered here
          DBService.sendSignal({
            type: 'answered_elsewhere',
            senderId: currentUser.id,
            receiverId: currentUser.id, // To self (other devices)
            callerId: callerId,
            deviceId: deviceId.current,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error('Error accepting call (after ending previous):', err);
        setIncomingCall(null); // Clear incoming call if acceptance fails
        cleanupCall(); // Ensure full cleanup if new call setup fails
      }
      return; // Exit after handling call waiting scenario
    }

    // Standard accept (not in a call)
    try {
      const callerId = incomingCall.callerId;
      const type = incomingCall.type;

      // Stop incoming ringtone
      stopCallAudio();

      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(type));

      // Try earpiece audio routing (Chrome desktop)
      try {
        const audioEl = document.querySelector('audio');
        if (audioEl && 'setSinkId' in audioEl) {
          // Default output device is earpiece on mobile
          (audioEl as any).setSinkId('default');
        }
      } catch { /* setSinkId not supported, ignored */ }

      console.log('[CallContext] Got local stream with', stream.getTracks().length, 'tracks');
      setLocalStream(stream);
      setIncomingCall(null);
      setActiveCall({ userId: callerId, type });

      // SET CALL START TIME IMMEDIATELY when accepting
      callStartTime.current = Date.now();
      callInitiator.current = callerId;

      // Set ref BEFORE creating peer connection so ICE candidates know where to go
      remoteUserIdRef.current = callerId;
      console.log('[CallContext] Call start time set on accept:', callStartTime.current);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = (window as any).pendingOffer;
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        DBService.sendSignal({
          type: 'answer',
          sdp: answer,
          senderId: currentUser.id,
          receiverId: callerId,
          answeringDeviceId: deviceId.current,
          timestamp: Date.now(),
        });

        // Notify other devices that call was answered here
        DBService.sendSignal({
          type: 'answered_elsewhere',
          senderId: currentUser.id,
          receiverId: currentUser.id, // To self (other devices)
          callerId: callerId,
          deviceId: deviceId.current,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (incomingCall && currentUser) {
      stopCallAudio();
      DBService.sendSignal({
        type: 'reject',
        senderId: currentUser.id,
        receiverId: incomingCall.callerId,
        timestamp: Date.now(),
      });

      // Save call record as rejected
      DBService.saveCallRecord({
        callerId: incomingCall.callerId,
        receiverId: currentUser.id,
        type: incomingCall.type,
        status: 'rejected',
        startedAt: Date.now(),
        endedAt: Date.now(),
        duration: 0,
      }).catch(e => console.warn('[CallRecord] Reject save error:', e));

      setIncomingCall(null);
      setCallState('idle');
    }
  };

  const endCall = () => {
    if (activeCall && currentUser) {
      stopCallAudio();
      playEndedTone();

      DBService.sendSignal({
        type: 'end',
        senderId: currentUser.id,
        receiverId: activeCall.userId,
        timestamp: Date.now(),
      });

      const duration = callStartTime.current > 0 ? Math.round((Date.now() - callStartTime.current) / 1000) : 0;

      // Save history for the ended call
      const chatId = [currentUser.id, activeCall.userId].sort().join('_');
      DBService.saveCallHistory(chatId, {
        type: activeCall.type,
        duration,
        status: 'completed',
        participants: [currentUser.id, activeCall.userId],
        callerId: callInitiator.current
      }).catch(err => console.error('Error saving call history:', err));

      // Save call record as ended
      DBService.saveCallRecord({
        callerId: callInitiator.current,
        receiverId: activeCall.userId,
        type: activeCall.type,
        status: 'ended',
        startedAt: callRecordStartTime.current || callStartTime.current,
        endedAt: Date.now(),
        duration,
      }).catch(e => console.warn('[CallRecord] End save error:', e));

      setCallState('ended');
      cleanupCall();
    };
  }

  function cleanupCall() {
    // Clear call timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    // Stop any playing tones
    stopCallAudio();

    stopQualityMonitoring(); // Stop quality monitoring

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    remoteStream?.getTracks().forEach(track => track.stop());
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setIsMicMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setConnectionQuality('high');
    callStartTime.current = 0;
    callInitiator.current = '';
    remoteUserIdRef.current = '';
    iceCandidatesQueue.current = [];
    setSecurityCode(null);
    callRecordStartTime.current = 0;

    // Reset call state to idle after a brief delay (so UI can show 'ended' state)
    setTimeout(() => setCallState('idle'), 500);

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  }

  function toggleMic() {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        console.log(`Audio track enabled: ${track.enabled}`); // Log audio track status
      });
      setIsMicMuted(!isMicMuted);
    }
  }

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsCameraOff(!isCameraOff);
    }
  };

  const toggleScreenShare = async () => {
    const pc = peerConnection.current;
    if (!pc) return;

    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false // System audio sharing is complex, sticking to video only for now
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Find existing video sender
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          // Replace camera track with screen track
          await sender.replaceTrack(screenTrack);
          setIsScreenSharing(true);
          setIsCameraOff(false); // Screen is visible, so "camera" is effectively on
        }

        // Handle when user stops sharing via browser UI
        screenTrack.onended = async () => {
          if (localStream) {
            const cameraTrack = localStream.getVideoTracks()[0];
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender && cameraTrack) {
              await sender.replaceTrack(cameraTrack);
            }
          }
          setIsScreenSharing(false);
          // Restore camera state
          if (localStream && isCameraOff) {
            localStream.getVideoTracks().forEach(track => track.enabled = false);
          }
        };

      } else {
        // Stop screen sharing manually
        if (localStream) {
          const cameraTrack = localStream.getVideoTracks()[0];
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && cameraTrack) {
            await sender.replaceTrack(cameraTrack);
          }
          // Stop screen tracks
          const senders = pc.getSenders();
          senders.forEach(s => {
            if (s.track?.label.includes('screen')) {
              s.track.stop();
            }
          });
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('[ScreenShare] Error toggling:', error);
      setIsScreenSharing(false);
    }
  };

  return (
    <CallContext.Provider
      value={{
        isInCall: !!activeCall,
        callState,
        incomingCall,
        activeCall,
        localStream,
        remoteStream,
        connectionQuality,
        securityCode,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        isMicMuted,
        isCameraOff,
        isScreenSharing,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
