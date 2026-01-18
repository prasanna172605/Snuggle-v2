import {
    collection,
    doc,
    setDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    Timestamp,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined';

export interface CallData {
    id: string;
    type: CallType;
    initiator: string;
    participants: string[];
    status: CallStatus;
    startTime: number;
    endTime?: number;
    duration?: number;
}

export interface CallSignal {
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    iceCandidates: RTCIceCandidateInit[];
}

// WebRTC configuration with STUN servers
const rtcConfiguration: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

class WebRTCService {
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private localStream: MediaStream | null = null;
    private remoteStreams: Map<string, MediaStream> = new Map();
    private currentCallId: string | null = null;

    /**
     * Get user media (camera/microphone)
     */
    async getUserMedia(audio: boolean, video: boolean): Promise<MediaStream> {
        try {
            const constraints: MediaStreamConstraints = {
                audio: audio ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : false,
                video: video ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                } : false
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('[WebRTC] Got local media stream');
            return this.localStream;
        } catch (error) {
            console.error('[WebRTC] Error getting user media:', error);
            throw new Error('Failed to access camera/microphone');
        }
    }

    /**
     * Create a peer connection for a specific user
     */
    createPeerConnection(
        userId: string,
        callId: string,
        onRemoteStream: (stream: MediaStream) => void,
        onIceCandidate: (candidate: RTCIceCandidate) => void
    ): RTCPeerConnection {
        const peerConnection = new RTCPeerConnection(rtcConfiguration);
        this.peerConnections.set(userId, peerConnection);
        this.currentCallId = callId;

        // Add local stream tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream!);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('[WebRTC] Received remote track from', userId);
            const [remoteStream] = event.streams;
            this.remoteStreams.set(userId, remoteStream);
            onRemoteStream(remoteStream);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('[WebRTC] New ICE candidate for', userId);
                onIceCandidate(event.candidate);
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state for', userId, ':', peerConnection.connectionState);

            if (peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'failed') {
                console.warn('[WebRTC] Connection lost with', userId);
            }
        };

        return peerConnection;
    }

    /**
     * Create and send an offer
     */
    async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
        const peerConnection = this.peerConnections.get(userId);
        if (!peerConnection) {
            throw new Error('Peer connection not found');
        }

        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });

        await peerConnection.setLocalDescription(offer);
        console.log('[WebRTC] Created offer for', userId);

        return offer;
    }

    /**
     * Create and send an answer
     */
    async createAnswer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        const peerConnection = this.peerConnections.get(userId);
        if (!peerConnection) {
            throw new Error('Peer connection not found');
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        console.log('[WebRTC] Created answer for', userId);
        return answer;
    }

    /**
     * Handle received answer
     */
    async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
        const peerConnection = this.peerConnections.get(userId);
        if (!peerConnection) {
            throw new Error('Peer connection not found');
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Set remote description from answer for', userId);
    }

    /**
     * Add ICE candidate
     */
    async addIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
        const peerConnection = this.peerConnections.get(userId);
        if (!peerConnection) {
            console.warn('[WebRTC] Peer connection not found for ICE candidate');
            return;
        }

        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[WebRTC] Added ICE candidate for', userId);
        } catch (error) {
            console.error('[WebRTC] Error adding ICE candidate:', error);
        }
    }

    /**
     * Toggle audio mute
     */
    toggleAudio(enabled: boolean): void {
        if (!this.localStream) return;

        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = enabled;
        });
        console.log('[WebRTC] Audio', enabled ? 'enabled' : 'muted');
    }

    /**
     * Toggle video
     */
    toggleVideo(enabled: boolean): void {
        if (!this.localStream) return;

        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = enabled;
        });
        console.log('[WebRTC] Video', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Get screen sharing stream
     */
    async shareScreen(): Promise<MediaStream> {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });

            console.log('[WebRTC] Got screen share stream');

            // Replace video track in all peer connections
            const screenTrack = screenStream.getVideoTracks()[0];
            const oldTrack = this.localStream?.getVideoTracks()[0];

            this.peerConnections.forEach((pc) => {
                const sender = pc.getSenders().find(s => s.track === oldTrack);
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            });

            // Stop screen share when user clicks browser's "Stop sharing" button
            screenTrack.onended = () => {
                console.log('[WebRTC] Screen share ended');
                // Revert to camera
                if (oldTrack) {
                    this.peerConnections.forEach((pc) => {
                        const sender = pc.getSenders().find(s => s.track === screenTrack);
                        if (sender) {
                            sender.replaceTrack(oldTrack);
                        }
                    });
                }
            };

            return screenStream;
        } catch (error) {
            console.error('[WebRTC] Error sharing screen:', error);
            throw new Error('Failed to share screen');
        }
    }

    /**
     * Close peer connection with a specific user
     */
    closePeerConnection(userId: string): void {
        const peerConnection = this.peerConnections.get(userId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(userId);
            this.remoteStreams.delete(userId);
            console.log('[WebRTC] Closed connection with', userId);
        }
    }

    /**
     * Close all connections and stop all streams
     */
    cleanup(): void {
        // Close all peer connections
        this.peerConnections.forEach((pc, userId) => {
            pc.close();
            console.log('[WebRTC] Closed connection with', userId);
        });
        this.peerConnections.clear();

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Clear remote streams
        this.remoteStreams.clear();

        this.currentCallId = null;
        console.log('[WebRTC] Cleanup complete');
    }

    /**
     * Get current call ID
     */
    getCurrentCallId(): string | null {
        return this.currentCallId;
    }

    /**
     * Get local stream
     */
    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    /**
     * Get remote streams map
     */
    getRemoteStreams(): Map<string, MediaStream> {
        return this.remoteStreams;
    }

    /**
     * Get connection stats for monitoring quality
     */
    async getConnectionStats(userId: string): Promise<RTCStatsReport | null> {
        const peerConnection = this.peerConnections.get(userId);
        if (!peerConnection) return null;

        return await peerConnection.getStats();
    }
}

// Export singleton instance
export const webrtcService = new WebRTCService();
