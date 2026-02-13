/**
 * Notification Dispatcher Service
 * Server-side notification creation for business events
 * Creates Firestore docs that trigger the existing Cloud Function (onNotificationCreate)
 */

import admin from '../config/firebase.js';

const db = admin.firestore();

/**
 * Dispatch a single notification
 * Creates a Firestore document in the 'notifications' collection,
 * which triggers the onNotificationCreate Cloud Function for push delivery
 *
 * @param {Object} params
 * @param {string} params.userId - Target user ID
 * @param {string} params.type - Notification type (info, success, warning, error, like, comment, follow, mention, system, media)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body text
 * @param {Object} [params.data] - Additional data payload (route, entityId, etc.)
 * @returns {Promise<string>} Created notification document ID
 */
export const dispatchNotification = async ({ userId, type, title, message, data = {} }) => {
    if (!userId || !type || !title || !message) {
        throw new Error('Missing required notification fields: userId, type, title, message');
    }

    const notification = {
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('notifications').add(notification);
    console.log(`[NotificationDispatcher] Created notification ${docRef.id} for user ${userId} (type: ${type})`);

    return docRef.id;
};

/**
 * Dispatch notification for a new media upload
 * Notifies followers that a user uploaded new content
 *
 * @param {string} uploaderId - User who uploaded the media
 * @param {string} mediaId - ID of the uploaded media document
 * @param {string} [mediaType='image'] - Type of media uploaded
 */
export const dispatchMediaUploadNotification = async (uploaderId, mediaId, mediaType = 'image') => {
    try {
        // Get uploader details
        const uploaderDoc = await db.collection('users').doc(uploaderId).get();
        if (!uploaderDoc.exists) return;

        const uploader = uploaderDoc.data();
        const uploaderName = uploader.fullName || uploader.username || 'Someone';

        // Get uploader's followers
        const followers = uploader.followers || [];
        if (followers.length === 0) return;

        // Batch notify followers (max 500 per batch in Firestore)
        const batchSize = 500;
        for (let i = 0; i < followers.length; i += batchSize) {
            const batch = db.batch();
            const chunk = followers.slice(i, i + batchSize);

            for (const followerId of chunk) {
                const notifRef = db.collection('notifications').doc();
                batch.set(notifRef, {
                    userId: followerId,
                    type: 'media',
                    title: 'New Upload',
                    message: `${uploaderName} shared a new ${mediaType}`,
                    data: {
                        route: `/profile/${uploaderId}`,
                        entityId: mediaId,
                        uploaderId,
                    },
                    isRead: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            await batch.commit();
            console.log(`[NotificationDispatcher] Notified ${chunk.length} followers of media upload`);
        }
    } catch (error) {
        console.error('[NotificationDispatcher] Error dispatching media notification:', error);
        // Don't throw — notification failure shouldn't block the upload response
    }
};

/**
 * Dispatch notification for content actions (create, update, etc.)
 *
 * @param {string} userId - User to notify
 * @param {string} contentId - Content document ID
 * @param {string} action - Action performed: 'created', 'updated', 'deleted', 'liked', 'commented'
 * @param {string} [actorName] - Name of the user who performed the action
 */
export const dispatchContentNotification = async (userId, contentId, action, actorName = 'Someone') => {
    const messages = {
        created: `${actorName} created new content`,
        updated: `${actorName} updated content`,
        deleted: `${actorName} deleted content`,
        liked: `${actorName} liked your content`,
        commented: `${actorName} commented on your content`,
    };

    const titles = {
        created: 'New Content',
        updated: 'Content Updated',
        deleted: 'Content Removed',
        liked: 'New Like',
        commented: 'New Comment',
    };

    await dispatchNotification({
        userId,
        type: action === 'liked' ? 'like' : action === 'commented' ? 'comment' : 'info',
        title: titles[action] || 'Activity',
        message: messages[action] || `${actorName} performed an action`,
        data: {
            route: `/content/${contentId}`,
            entityId: contentId,
        },
    });
};

/**
 * Batch dispatch notifications to multiple users
 *
 * @param {string[]} userIds - Array of user IDs to notify
 * @param {Object} notification - Notification payload (type, title, message, data)
 * @returns {Promise<number>} Number of notifications dispatched
 */
export const dispatchBatchNotifications = async (userIds, { type, title, message, data = {} }) => {
    if (!userIds || userIds.length === 0) return 0;

    const batchSize = 500;
    let dispatched = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = db.batch();
        const chunk = userIds.slice(i, i + batchSize);

        for (const userId of chunk) {
            const notifRef = db.collection('notifications').doc();
            batch.set(notifRef, {
                userId,
                type,
                title,
                message,
                data,
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        await batch.commit();
        dispatched += chunk.length;
    }

    console.log(`[NotificationDispatcher] Batch dispatched ${dispatched} notifications`);
    return dispatched;
};

export default {
    dispatchNotification,
    dispatchMediaUploadNotification,
    dispatchContentNotification,
    dispatchBatchNotifications,
};
