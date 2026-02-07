import express from 'express';
import { verifyToken } from '../../middleware/auth.js';
import AppError from '../utils/AppError.js';
import admin from '../config/firebase.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// POST /api/v1/notifications
// Create a new notification (usually called by other services, but opened here for flexibility)
router.post('/', async (req, res, next) => {
    try {
        const { userId, type, title, message, data } = req.body;

        if (!userId || !type || !title || !message) {
            return next(new AppError('Missing required fields: userId, type, title, message', 400));
        }

        const validTypes = ['info', 'success', 'warning', 'error', 'like', 'comment', 'follow', 'mention', 'system'];
        if (!validTypes.includes(type)) {
            return next(new AppError('Invalid notification type', 400));
        }

        const notification = {
            userId,
            type,
            title,
            message,
            data: data || {},
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const db = admin.firestore();
        const docRef = await db.collection('notifications').add(notification);

        // Fetch the created doc to return specific ID and processed timestamp
        const docSnap = await docRef.get();

        res.status(201).json({
            status: 'success',
            data: {
                notification: {
                    id: docRef.id,
                    ...docSnap.data()
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/notifications
// Get user's recent notifications
router.get('/', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const limit = parseInt(req.query.limit) || 20;

        const db = admin.firestore();
        const snapshot = await db.collection('notifications')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            status: 'success',
            results: notifications.length,
            data: {
                notifications
            }
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/v1/notifications/:id/read
// Mark specific notification as read
router.patch('/:id/read', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { id } = req.params;

        const db = admin.firestore();
        const notifRef = db.collection('notifications').doc(id);
        const docSnap = await notifRef.get();

        if (!docSnap.exists) {
            return next(new AppError('Notification not found', 404));
        }

        if (docSnap.data().userId !== uid) {
            return next(new AppError('Unauthorized', 403));
        }

        await notifRef.update({
            isRead: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({
            status: 'success',
            message: 'Notification marked as read'
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/v1/notifications/read-all
// Mark all notifications as read for the user
router.patch('/read-all', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const db = admin.firestore();

        // Batch update is efficient for this
        const batch = db.batch();
        const snapshot = await db.collection('notifications')
            .where('userId', '==', uid)
            .where('isRead', '==', false)
            .get();

        if (snapshot.empty) {
            return res.status(200).json({
                status: 'success',
                message: 'No unread notifications to update'
            });
        }

        snapshot.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();

        res.status(200).json({
            status: 'success',
            message: `${snapshot.size} notifications marked as read`
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/notifications/:id
// Delete a notification
router.delete('/:id', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { id } = req.params;

        const db = admin.firestore();
        const notifRef = db.collection('notifications').doc(id);
        const docSnap = await notifRef.get();

        if (!docSnap.exists) {
            return next(new AppError('Notification not found', 404));
        }

        if (docSnap.data().userId !== uid) {
            return next(new AppError('Unauthorized', 403));
        }

        await notifRef.delete();

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(error);
    }
});

export default router;
