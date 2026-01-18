
import express from 'express';
import { verifyToken } from '../../middleware/auth.js';
import AppError from '../utils/AppError.js';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(verifyToken);

import admin from '../config/firebase.js';

// GET /api/v1/users/me
router.get('/me', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return next(new AppError('User profile not found', 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                user: userDoc.data()
            }
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/users/me
router.put('/me', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { bio, phone, location, dateOfBirth, socialLinks, fullName } = req.body;

        // Validation
        if (bio && bio.length > 500) {
            return next(new AppError('Bio must be less than 500 characters', 400));
        }

        // Validate Phone (Basic regex)
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
            const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
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
        if (location) updates.location = location; // Ensure object structure
        if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
        if (socialLinks) updates.socialLinks = socialLinks;

        updates.updatedAt = Date.now();

        const db = admin.firestore();
        await db.collection('users').doc(uid).update(updates);

        // Fetch updated
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

// PATCH /api/v1/users/me/avatar
router.patch('/me/avatar', async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { avatarUrl } = req.body;

        if (!avatarUrl) {
            return next(new AppError('Avatar URL is required', 400));
        }

        const db = admin.firestore();
        await db.collection('users').doc(uid).update({
            avatar: avatarUrl,
            updatedAt: Date.now()
        });

        res.status(200).json({
            status: 'success',
            message: 'Avatar updated successfully',
            data: {
                avatar: avatarUrl
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
