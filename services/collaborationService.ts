/**
 * Real-Time Collaboration Service
 * Firebase-native collaboration without Socket.io
 */

import { database } from './firebase';
import { ref, set, onValue, onDisconnect, serverTimestamp, remove, update, get } from 'firebase/database';
import { User } from 'firebase/auth';
import { logger } from '@/utils/logger';

export interface PresenceData {
    userId: string;
    online: boolean;
    lastActive: number;
    currentRoom?: string;
    username?: string;
    avatar?: string;
}

export interface TypingUser {
    userId: string;
    username: string;
    timestamp: number;
}

/**
 * Collaboration Service - Firebase-native real-time features
 */
class CollaborationService {
    private presenceRef = ref(database, 'presence');
    private typingRefs = new Map<string, any>();
    private typingTimeouts = new Map<string, NodeJS.Timeout>();

    /**
     * Initialize user presence
     * Sets online status and auto-cleanup on disconnect
     */
    async initializePresence(user: User, userData?: { username?: string; avatar?: string }): Promise<void> {
        if (!user) return;

        const userPresenceRef = ref(database, `presence/${user.uid}`);

        const presenceData: PresenceData = {
            userId: user.uid,
            online: true,
            lastActive: Date.now(),
            username: userData?.username || user.displayName || 'Unknown',
            avatar: userData?.avatar || user.photoURL || undefined,
        };

        try {
            // Set online status
            await set(userPresenceRef, presenceData);

            // Set up auto-cleanup on disconnect
            await onDisconnect(userPresenceRef).update({
                online: false,
                lastActive: serverTimestamp(),
            });

            // Update last active every 60 seconds
            const intervalId = setInterval(async () => {
                try {
                    await update(userPresenceRef, {
                        lastActive: serverTimestamp(),
                    });
                } catch (error) {
                    logger.error('Failed to update presence', error as Error);
                }
            }, 60000);

            // Cleanup interval on page unload
            window.addEventListener('beforeunload', () => {
                clearInterval(intervalId);
            });

            logger.info('Presence initialized', { userId: user.uid });
        } catch (error) {
            logger.error('Failed to initialize presence', error as Error);
        }
    }

    /**
     * Update current room (for showing who's viewing what)
     */
    async updateCurrentRoom(userId: string, roomId: string | null): Promise<void> {
        if (!userId) return;

        try {
            const userPresenceRef = ref(database, `presence/${userId}`);
            await update(userPresenceRef, {
                currentRoom: roomId,
                lastActive: serverTimestamp(),
            });
        } catch (error) {
            logger.error('Failed to update current room', error as Error);
        }
    }

    /**
     * Subscribe to online users in a specific room
     */
    subscribeToRoomPresence(
        roomId: string,
        callback: (users: PresenceData[]) => void
    ): () => void {
        const presenceQuery = ref(database, 'presence');

        const unsubscribe = onValue(presenceQuery, (snapshot) => {
            const presenceData = snapshot.val() || {};
            const onlineUsers = Object.values(presenceData as Record<string, PresenceData>)
                .filter(user => user.online && user.currentRoom === roomId);

            callback(onlineUsers);
        });

        return unsubscribe;
    }

    /**
     * Subscribe to all online users
     */
    subscribeToOnlineUsers(callback: (users: PresenceData[]) => void): () => void {
        const unsubscribe = onValue(this.presenceRef, (snapshot) => {
            const presenceData = snapshot.val() || {};
            const onlineUsers = Object.values(presenceData as Record<string, PresenceData>)
                .filter(user => user.online);

            callback(onlineUsers);
        });

        return unsubscribe;
    }

    /**
     * Get user presence status
     */
    async getUserPresence(userId: string): Promise<PresenceData | null> {
        try {
            const userPresenceRef = ref(database, `presence/${userId}`);
            const snapshot = await get(userPresenceRef);
            return snapshot.exists() ? snapshot.val() : null;
        } catch (error) {
            logger.error('Failed to get user presence', error as Error);
            return null;
        }
    }

    /**
     * Set typing indicator in a room
     */
    async setTyping(roomId: string, userId: string, username: string, isTyping: boolean): Promise<void> {
        if (!roomId || !userId) return;

        const typingRef = ref(database, `typing/${roomId}/${userId}`);
        const timeoutKey = `${roomId}_${userId}`;

        try {
            if (isTyping) {
                // Set typing indicator
                await set(typingRef, {
                    userId,
                    username,
                    timestamp: serverTimestamp(),
                });

                // Auto-remove after 3 seconds
                if (this.typingTimeouts.has(timeoutKey)) {
                    clearTimeout(this.typingTimeouts.get(timeoutKey)!);
                }

                const timeout = setTimeout(async () => {
                    await remove(typingRef);
                    this.typingTimeouts.delete(timeoutKey);
                }, 3000);

                this.typingTimeouts.set(timeoutKey, timeout);

                // Remove on disconnect
                await onDisconnect(typingRef).remove();
            } else {
                // Remove typing indicator
                await remove(typingRef);
                if (this.typingTimeouts.has(timeoutKey)) {
                    clearTimeout(this.typingTimeouts.get(timeoutKey)!);
                    this.typingTimeouts.delete(timeoutKey);
                }
            }
        } catch (error) {
            logger.error('Failed to set typing status', error as Error);
        }
    }

    /**
     * Subscribe to typing indicators in a room
     */
    subscribeToTyping(
        roomId: string,
        currentUserId: string,
        callback: (typingUsers: TypingUser[]) => void
    ): () => void {
        const typingRef = ref(database, `typing/${roomId}`);

        const unsubscribe = onValue(typingRef, (snapshot) => {
            const typingData = snapshot.val() || {};
            const typingUsers = Object.values(typingData as Record<string, TypingUser>)
                .filter(user => user.userId !== currentUserId); // Exclude current user

            callback(typingUsers);
        });

        return unsubscribe;
    }

    /**
     * Clean up resources
     */
    async cleanup(userId: string): Promise<void> {
        try {
            // Clear all typing timeouts
            this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
            this.typingTimeouts.clear();

            // Set offline
            if (userId) {
                const userPresenceRef = ref(database, `presence/${userId}`);
                await update(userPresenceRef, {
                    online: false,
                    lastActive: serverTimestamp(),
                    currentRoom: null,
                });
            }

            logger.info('Collaboration cleanup complete');
        } catch (error) {
            logger.error('Cleanup failed', error as Error);
        }
    }
}

export const collaborationService = new CollaborationService();
export default collaborationService;
