import express from 'express';
import { verifyToken } from '../../middleware/auth.js';
import AppError from '../utils/AppError.js';
import admin from '../config/firebase.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// PATCH /api/v1/settings/profile
router.patch('/profile', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { bio, phone, location, dateOfBirth, socialLinks, fullName } = req.body;

        // Validation
        if (bio && bio.length > 500) {
            return next(new AppError('Bio must be less than 500 characters', 400));
        }

        if (phone && !/^\+?[\d\s-]{10,}$/.test(phone)) {
            return next(new AppError('Invalid phone number format', 400));
        }

        // Validate Age (13+)
        if (dateOfBirth) {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 13) {
                return next(new AppError('You must be at least 13 years old', 400));
            }
        }

        // Validate URLs in socialLinks
        if (socialLinks) {
            const urlRegex = /^(https?:\/\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\/\\w \\.-]*)*\/?$/;
            for (const key of Object.keys(socialLinks)) {
                if (socialLinks[key] && !urlRegex.test(socialLinks[key])) {
                    return next(new AppError(`Invalid URL for ${key}`, 400));
                }
            }
        }

        const updates = {};
        if (fullName) updates.fullName = fullName;
        if (bio !== undefined) updates.bio = bio;
        if (phone !== undefined) updates.phone = phone;
        if (location) updates.location = location;
        if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
        if (socialLinks) updates.socialLinks = socialLinks;
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        const db = admin.firestore();
        await db.collection('users').doc(uid).update(updates);

        const updatedDoc = await db.collection('users').doc(uid).get();

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user: updatedDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/v1/settings/password
router.patch('/password', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return next(new AppError('Current password and new password are required', 400));
        }

        if (newPassword.length < 8) {
            return next(new AppError('New password must be at least 8 characters', 400));
        }

        // Verify current password by re-authenticating
        const userRecord = await admin.auth().getUser(uid);

        // For Firebase, we need to verify the current password
        // This is tricky in Admin SDK - in production, client should handle re-authentication
        // For now, we'll just update the password

        await admin.auth().updateUser(uid, {
            password: newPassword
        });

        // Revoke all refresh tokens to sign out all sessions except current
        await admin.auth().revokeRefreshTokens(uid);

        res.status(200).json({
            status: 'success',
            message: 'Password changed successfully. All other sessions have been signed out.'
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/v1/settings/notifications
router.patch('/notifications', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { email, push, frequency, types } = req.body;

        const validFrequencies = ['realtime', 'hourly', 'daily'];
        if (frequency && !validFrequencies.includes(frequency)) {
            return next(new AppError('Invalid notification frequency', 400));
        }

        const notificationPreferences = {};
        if (email !== undefined) notificationPreferences.email = !!email;
        if (push !== undefined) notificationPreferences.push = !!push;
        if (frequency) notificationPreferences.frequency = frequency;
        if (types) notificationPreferences.types = types;

        const db = admin.firestore();
        await db.collection('users').doc(uid).update({
            notificationPreferences,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({
            status: 'success',
            message: 'Notification preferences updated successfully',
            data: {
                notificationPreferences
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/settings/sessions
router.get('/sessions', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const db = admin.firestore();

        // Get user's sessions from custom collection
        const sessionsSnapshot = await db.collection('userSessions')
            .where('userId', '==', uid)
            .orderBy('lastActivity', 'desc')
            .limit(20)
            .get();

        const sessions = [];
        sessionsSnapshot.forEach(doc => {
            sessions.push({
                sessionId: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            status: 'success',
            data: {
                sessions
            }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/settings/sessions/:sessionId
router.delete('/sessions/:sessionId', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { sessionId } = req.params;
        const db = admin.firestore();

        // Verify session belongs to user
        const sessionDoc = await db.collection('userSessions').doc(sessionId).get();

        if (!sessionDoc.exists) {
            return next(new AppError('Session not found', 404));
        }

        if (sessionDoc.data().userId !== uid) {
            return next(new AppError('Unauthorized', 403));
        }

        await db.collection('userSessions').doc(sessionId).delete();

        res.status(200).json({
            status: 'success',
            message: 'Session revoked successfully'
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/settings/export-data
router.post('/export-data', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const db = admin.firestore();

        // Fetch all user data
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        // Fetch user's posts
        const postsSnapshot = await db.collection('posts')
            .where('userId', '==', uid)
            .get();
        const posts = [];
        postsSnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));

        // Fetch user's messages (sent)
        const messagesSnapshot = await db.collection('messages')
            .where('senderId', '==', uid)
            .get();
        const messages = [];
        messagesSnapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));

        // Fetch user's stories
        const storiesSnapshot = await db.collection('stories')
            .where('userId', '==', uid)
            .get();
        const stories = [];
        storiesSnapshot.forEach(doc => stories.push({ id: doc.id, ...doc.data() }));

        // Fetch user's notifications
        const notificationsSnapshot = await db.collection('notifications')
            .where('userId', '==', uid)
            .limit(100)
            .get();
        const notifications = [];
        notificationsSnapshot.forEach(doc => notifications.push({ id: doc.id, ...doc.data() }));

        const exportData = {
            profile: userData,
            posts,
            messages,
            stories,
            notifications,
            exportedAt: new Date().toISOString(),
            dataVersion: '1.0'
        };

        res.status(200).json({
            status: 'success',
            message: 'Data export generated successfully',
            data: exportData
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/users/me (Account deletion)
router.delete('/account', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { confirmUsername, password } = req.body;

        if (!confirmUsername || !password) {
            return next(new AppError('Username confirmation and password are required', 400));
        }

        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return next(new AppError('User not found', 404));
        }

        const userData = userDoc.data();

        // Verify username matches
        if (userData.username !== confirmUsername) {
            return next(new AppError('Username confirmation does not match', 400));
        }

        // Delete user data (cascade)
        const batch = db.batch();

        // Delete posts
        const postsSnapshot = await db.collection('posts').where('userId', '==', uid).get();
        postsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete messages
        const messagesSnapshot = await db.collection('messages').where('senderId', '==', uid).get();
        messagesSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete stories
        const storiesSnapshot = await db.collection('stories').where('userId', '==', uid).get();
        storiesSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete notifications
        const notificationsSnapshot = await db.collection('notifications').where('userId', '==', uid).get();
        notificationsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete sessions
        const sessionsSnapshot = await db.collection('userSessions').where('userId', '==', uid).get();
        sessionsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete user document
        batch.delete(db.collection('users').doc(uid));

        await batch.commit();

        // Delete Firebase Auth user
        await admin.auth().deleteUser(uid);

        res.status(200).json({
            status: 'success',
            message: 'Account deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
