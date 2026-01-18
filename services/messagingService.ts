import { getDatabase, ref, set, onValue, remove, onDisconnect } from 'firebase/database';
import { auth } from './firebase';

const rtdb = getDatabase();

/**
 * Typing Indicator Service
 */
export const TypingService = {
    /**
     * Set typing status for a chat
     */
    setTyping: (chatId: string, isTyping: boolean) => {
        const user = auth.currentUser;
        if (!user) return;

        const typingRef = ref(rtdb, `typing/${chatId}/${user.uid}`);

        if (isTyping) {
            set(typingRef, true);

            // Auto-remove typing status after 5 seconds
            setTimeout(() => {
                remove(typingRef);
            }, 5000);
        } else {
            remove(typingRef);
        }
    },

    /**
     * Subscribe to typing indicators for a chat
     */
    subscribeToTyping: (chatId: string, callback: (typingUsers: string[]) => void) => {
        const user = auth.currentUser;
        if (!user) return () => { };

        const typingRef = ref(rtdb, `typing/${chatId}`);

        const unsubscribe = onValue(typingRef, (snapshot) => {
            const typingData = snapshot.val() || {};
            const typingUsers = Object.keys(typingData).filter(uid => uid !== user.uid);
            callback(typingUsers);
        });

        return unsubscribe;
    }
};

/**
 * Presence Service
 */
export const PresenceService = {
    /**
     * Set user online status
     */
    setOnline: () => {
        const user = auth.currentUser;
        if (!user) return;

        const presenceRef = ref(rtdb, `presence/${user.uid}`);
        const connectedRef = ref(rtdb, '.info/connected');

        onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === true) {
                // Set online
                set(presenceRef, {
                    online: true,
                    inCall: false,
                    lastSeen: Date.now()
                });

                // Set offline on disconnect
                onDisconnect(presenceRef).set({
                    online: false,
                    inCall: false,
                    lastSeen: Date.now()
                });
            }
        });
    },

    /**
     * Set in-call status
     */
    setInCall: (inCall: boolean) => {
        const user = auth.currentUser;
        if (!user) return;

        const presenceRef = ref(rtdb, `presence/${user.uid}`);
        set(presenceRef, {
            online: true,
            inCall,
            lastSeen: Date.now()
        });
    },

    /**
     * Subscribe to user presence
     */
    subscribeToPresence: (userId: string, callback: (presence: { online: boolean; inCall: boolean; lastSeen: number } | null) => void) => {
        const presenceRef = ref(rtdb, `presence/${userId}`);

        const unsubscribe = onValue(presenceRef, (snapshot) => {
            callback(snapshot.val());
        });

        return unsubscribe;
    },

    /**
     * Check if user is busy (in another call)
     */
    checkBusy: async (userId: string): Promise<boolean> => {
        const presenceRef = ref(rtdb, `presence/${userId}`);

        return new Promise((resolve) => {
            onValue(presenceRef, (snapshot) => {
                const presence = snapshot.val();
                resolve(presence?.inCall === true);
            }, { onlyOnce: true });
        });
    }
};

/**
 * Read Receipts Service
 */
export const ReadReceiptService = {
    /**
     * Mark message as read
     */
    markAsRead: (chatId: string, messageId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        const readRef = ref(rtdb, `messages/${chatId}/${messageId}/readBy/${user.uid}`);
        set(readRef, Date.now());
    },

    /**
     * Mark all messages in chat as read
     */
    markAllAsRead: (chatId: string, messageIds: string[]) => {
        const user = auth.currentUser;
        if (!user) return;

        messageIds.forEach(messageId => {
            const readRef = ref(rtdb, `messages/${chatId}/${messageId}/readBy/${user.uid}`);
            set(readRef, Date.now());
        });
    },

    /**
     * Subscribe to read receipts for a message
     */
    subscribeToReceipts: (chatId: string, messageId: string, callback: (readBy: Record<string, number>) => void) => {
        const readRef = ref(rtdb, `messages/${chatId}/${messageId}/readBy`);

        const unsubscribe = onValue(readRef, (snapshot) => {
            callback(snapshot.val() || {});
        });

        return unsubscribe;
    }
};
