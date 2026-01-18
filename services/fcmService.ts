import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const vapidKey = 'YOUR_VAPID_KEY'; // Replace with your VAPID key from Firebase Console

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
};

/**
 * Get FCM token
 */
export const getFCMToken = async (): Promise<string | null> => {
    try {
        const messaging = getMessaging();
        const currentToken = await getToken(messaging, { vapidKey });

        if (currentToken) {
            console.log('FCM Token:', currentToken);
            return currentToken;
        } else {
            console.log('No registration token available.');
            return null;
        }
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

/**
 * Save FCM token to Firestore
 */
export const saveTokenToFirestore = async (token: string): Promise<void> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if token already exists
        const tokensRef = collection(db, 'fcmTokens');
        const q = query(
            tokensRef,
            where('userId', '==', user.uid),
            where('token', '==', token)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Update lastActiveAt
            const tokenDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'fcmTokens', tokenDoc.id), {
                lastActiveAt: Date.now()
            });
            console.log('FCM token updated');
        } else {
            // Create new token document
            await addDoc(tokensRef, {
                userId: user.uid,
                token,
                platform: 'web',
                createdAt: Date.now(),
                lastActiveAt: Date.now()
            });
            console.log('FCM token saved to Firestore');
        }
    } catch (error) {
        console.error('Error saving FCM token:', error);
        throw error;
    }
};

/**
 * Delete FCM token (on logout)
 */
export const deleteFCMToken = async (): Promise<void> => {
    try {
        const messaging = getMessaging();
        await deleteToken(messaging);

        // Remove from Firestore
        const user = auth.currentUser;
        if (user) {
            const tokensRef = collection(db, 'fcmTokens');
            const q = query(tokensRef, where('userId', '==', user.uid));
            const snapshot = await getDocs(q);

            const deletePromises = snapshot.docs.map(document =>
                deleteDoc(doc(db, 'fcmTokens', document.id))
            );

            await Promise.all(deletePromises);
            console.log('FCM tokens deleted');
        }
    } catch (error) {
        console.error('Error deleting FCM token:', error);
        throw error;
    }
};

/**
 * Initialize FCM and request permission
 */
export const initializeFCM = async (): Promise<void> => {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }

        // Check if permission is already granted
        if (Notification.permission === 'granted') {
            const token = await getFCMToken();
            if (token) {
                await saveTokenToFirestore(token);
            }
        } else if (Notification.permission === 'default') {
            // Will request permission later via UI button
            console.log('Notification permission not yet requested');
        }
    } catch (error) {
        console.error('Error initializing FCM:', error);
    }
};

/**
 * Subscribe to foreground messages
 */
export const subscribeForegroundMessages = (
    onMessageReceived: (payload: any) => void
): (() => void) => {
    try {
        const messaging = getMessaging();

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            onMessageReceived(payload);
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to foreground messages:', error);
        return () => { };
    }
};

/**
 * Show a toast notification for foreground messages
 */
export const showForegroundNotification = (payload: any): void => {
    const title = payload.notification?.title || 'New Notification';
    const body = payload.notification?.body || '';

    // Create a simple toast (you can replace with a proper toast library)
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-sm z-50 border border-gray-200 dark:border-gray-700';
    toast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0">
        <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
      </div>
      <div class="flex-1">
        <h4 class="font-semibold text-gray-900 dark:text-white">${title}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${body}</p>
      </div>
      <button class="flex-shrink-0 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
};
