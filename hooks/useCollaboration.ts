/**
 * Collaboration Hooks
 * React hooks for real-time collaboration features
 */

import { useState, useEffect, useCallback } from 'react';
import { collaborationService, PresenceData, TypingUser } from '@/services/collaborationService';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook to manage user presence
 */
export function usePresence(roomId?: string) {
    const { currentUser } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<PresenceData[]>([]);

    useEffect(() => {
        if (!currentUser) return;

        // Initialize presence
        collaborationService.initializePresence(currentUser, {
            username: currentUser.displayName || undefined,
            avatar: currentUser.photoURL || undefined,
        });

        // Update current room
        if (roomId) {
            collaborationService.updateCurrentRoom(currentUser.uid, roomId);
        }

        // Subscribe to room presence
        const unsubscribe = roomId
            ? collaborationService.subscribeToRoomPresence(roomId, setOnlineUsers)
            : collaborationService.subscribeToOnlineUsers(setOnlineUsers);

        // Cleanup
        return () => {
            unsubscribe();
            if (roomId) {
                collaborationService.updateCurrentRoom(currentUser.uid, null);
            }
        };
    }, [currentUser, roomId]);

    return { onlineUsers };
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(roomId: string) {
    const { currentUser } = useAuth();
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!currentUser || !roomId) return;

        const unsubscribe = collaborationService.subscribeToTyping(
            roomId,
            currentUser.uid,
            setTypingUsers
        );

        return () => {
            unsubscribe();
            if (isTyping) {
                collaborationService.setTyping(
                    roomId,
                    currentUser.uid,
                    currentUser.displayName || 'User',
                    false
                );
            }
        };
    }, [currentUser, roomId]);

    const setTyping = useCallback(
        (typing: boolean) => {
            if (!currentUser || !roomId) return;

            setIsTyping(typing);
            collaborationService.setTyping(
                roomId,
                currentUser.uid,
                currentUser.displayName || 'User',
                typing
            );
        },
        [currentUser, roomId]
    );

    return { typingUsers, setTyping };
}

/**
 * Hook to check if a specific user is online
 */
export function useUserOnlineStatus(userId: string) {
    const [presence, setPresence] = useState<PresenceData | null>(null);
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        if (!userId) return;

        collaborationService.getUserPresence(userId).then(data => {
            setPresence(data);
            setIsOnline(data?.online || false);
        });

        // TODO: Subscribe to updates
    }, [userId]);

    return { isOnline, presence };
}

export default {
    usePresence,
    useTypingIndicator,
    useUserOnlineStatus,
};
