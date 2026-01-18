import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Notification } from '../types/notification';


/**
 * Subscribe to user's notifications in real-time
 */
export const subscribeToNotifications = (
    userId: string,
    callback: (notifications: Notification[]) => void,
    limitCount: number = 50
): (() => void) => {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications: Notification[] = [];
        snapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() } as Notification);
        });
        callback(notifications);
    }, (error) => {
        console.error('Error listening to notifications:', error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
    try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('isRead', '==', false)
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (notificationId: string): Promise<void> => {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
            isRead: true
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
    try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('isRead', '==', false)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => {
            batch.update(document.ref, { isRead: true });
        });

        await batch.commit();
    } catch (error) {
        console.error('Error marking all as read:', error);
        throw error;
    }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await deleteDoc(notificationRef);
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
};

/**
 * Create a notification (typically called from backend/Cloud Functions)
 * This is included for client-side testing purposes
 */
export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void> => {
    try {
        const { addDoc } = await import('firebase/firestore');
        const notificationsRef = collection(db, 'notifications');
        await addDoc(notificationsRef, {
            ...notification,
            createdAt: Date.now()
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};
