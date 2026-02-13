/**
 * Media Upload API Routes
 * Handles server-side media uploads with Firebase Storage
 */

import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import admin from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';
import { checkOwnership } from '../middleware/ownership.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { processMediaMetadata, sanitizeText, moderateContent } from '../services/contentProcessor.js';
import { dispatchMediaUploadNotification } from '../services/notificationDispatcher.js';
import { MediaQuerySchema, UpdateMediaSchema } from '../validation/media.schema.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

const router = express.Router();

// ─── Multer Configuration ────────────────────────────────────────────
// Store files in memory buffer for direct upload to Firebase Storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max (validated per-type in processor)
        files: 5,                     // Max 5 files per request
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm',
            'application/pdf',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError(`Unsupported file type: ${file.mimetype}`, 400), false);
        }
    },
});

// Apply auth to all media routes
router.use(verifyToken);

// ─── POST /api/v1/media/upload ───────────────────────────────────────
// Upload a single media file
router.post('/upload', uploadLimiter, upload.single('file'), catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError('No file provided. Use form field name "file".', 400));
    }

    const userId = req.user.uid;

    // 1. Validate and process media metadata
    const processed = processMediaMetadata(req.file);
    if (!processed.valid) {
        return next(new AppError(processed.error, 400));
    }

    // 2. Sanitize optional text fields
    const title = req.body.title ? sanitizeText(req.body.title) : req.file.originalname;
    const description = req.body.description ? sanitizeText(req.body.description) : '';

    // 3. Moderate text content if provided
    if (req.body.title) {
        const modResult = moderateContent(req.body.title);
        if (!modResult.safe) {
            return next(new AppError(modResult.reason, 400));
        }
    }
    if (req.body.description) {
        const modResult = moderateContent(req.body.description);
        if (!modResult.safe) {
            return next(new AppError(modResult.reason, 400));
        }
    }

    // 4. Upload to Firebase Storage
    const mediaId = uuidv4();
    const extension = req.file.originalname.split('.').pop() || 'bin';
    const storagePath = `uploads/${userId}/raw/${mediaId}.${extension}`;

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    await file.save(req.file.buffer, {
        metadata: {
            contentType: req.file.mimetype,
            metadata: {
                userId,
                mediaId,
                originalName: req.file.originalname,
            },
        },
    });

    // 5. Get signed download URL (valid for 7 days)
    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    // 6. Save metadata to Firestore
    const mediaDoc = {
        id: mediaId,
        userId,
        title,
        description,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        category: processed.metadata.category,
        storagePath,
        url: signedUrl,
        status: processed.metadata.category === 'image' ? 'processing' : 'complete',
        tags: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection('media').doc(mediaId).set(mediaDoc);

    // 7. Fire-and-forget notification to followers
    dispatchMediaUploadNotification(userId, mediaId, processed.metadata.category).catch(() => {});

    console.log(`[Media] Uploaded ${processed.metadata.category}: ${mediaId} by user ${userId}`);

    res.status(201).json({
        status: 'success',
        data: {
            media: {
                id: mediaId,
                ...mediaDoc,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }
        }
    });
}));

// ─── POST /api/v1/media/upload-multiple ──────────────────────────────
// Upload up to 5 files at once
router.post('/upload-multiple', uploadLimiter, upload.array('files', 5), catchAsync(async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next(new AppError('No files provided. Use form field name "files".', 400));
    }

    const userId = req.user.uid;
    const bucket = admin.storage().bucket();
    const db = admin.firestore();
    const batch = db.batch();
    const results = [];

    for (const uploadedFile of req.files) {
        // Validate
        const processed = processMediaMetadata(uploadedFile);
        if (!processed.valid) {
            return next(new AppError(`File "${uploadedFile.originalname}": ${processed.error}`, 400));
        }

        // Upload to Storage
        const mediaId = uuidv4();
        const extension = uploadedFile.originalname.split('.').pop() || 'bin';
        const storagePath = `uploads/${userId}/raw/${mediaId}.${extension}`;
        const file = bucket.file(storagePath);

        await file.save(uploadedFile.buffer, {
            metadata: {
                contentType: uploadedFile.mimetype,
                metadata: { userId, mediaId, originalName: uploadedFile.originalname },
            },
        });

        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        // Batch Firestore write
        const mediaDoc = {
            id: mediaId,
            userId,
            title: uploadedFile.originalname,
            description: '',
            originalName: uploadedFile.originalname,
            mimeType: uploadedFile.mimetype,
            size: uploadedFile.size,
            category: processed.metadata.category,
            storagePath,
            url: signedUrl,
            status: processed.metadata.category === 'image' ? 'processing' : 'complete',
            tags: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        batch.set(db.collection('media').doc(mediaId), mediaDoc);

        results.push({
            id: mediaId,
            ...mediaDoc,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    }

    await batch.commit();

    console.log(`[Media] Uploaded ${results.length} files by user ${userId}`);

    res.status(201).json({
        status: 'success',
        results: results.length,
        data: { media: results }
    });
}));

// ─── GET /api/v1/media/:id ───────────────────────────────────────────
// Get single media metadata
router.get('/:id', catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const db = admin.firestore();
    const docSnap = await db.collection('media').doc(id).get();

    if (!docSnap.exists) {
        return next(new AppError('Media not found', 404));
    }

    const data = docSnap.data();

    // Only owner can view their own media (for now)
    if (data.userId !== req.user.uid) {
        return next(new AppError('You do not have permission to view this media', 403));
    }

    res.status(200).json({
        status: 'success',
        data: { media: { id: docSnap.id, ...data } }
    });
}));

// ─── PATCH /api/v1/media/:id ─────────────────────────────────────────
// Update media metadata (title, description, tags)
router.patch('/:id', checkOwnership('media'), catchAsync(async (req, res, next) => {
    const validation = UpdateMediaSchema.safeParse(req.body);
    if (!validation.success) {
        const errors = validation.error.issues.map(i => i.message).join(', ');
        return next(new AppError(errors, 400));
    }

    const updates = { ...validation.data, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    // Sanitize text fields
    if (updates.title) {
        updates.title = sanitizeText(updates.title);
        const mod = moderateContent(updates.title);
        if (!mod.safe) return next(new AppError(mod.reason, 400));
    }
    if (updates.description) {
        updates.description = sanitizeText(updates.description);
        const mod = moderateContent(updates.description);
        if (!mod.safe) return next(new AppError(mod.reason, 400));
    }

    const db = admin.firestore();
    await db.collection('media').doc(req.params.id).update(updates);

    const updated = await db.collection('media').doc(req.params.id).get();

    res.status(200).json({
        status: 'success',
        data: { media: { id: updated.id, ...updated.data() } }
    });
}));

// ─── DELETE /api/v1/media/:id ────────────────────────────────────────
// Delete media (file from storage + Firestore doc)
router.delete('/:id', checkOwnership('media'), catchAsync(async (req, res, next) => {
    const mediaData = req.resourceDoc; // Attached by ownership middleware

    // Delete file from Firebase Storage
    try {
        const bucket = admin.storage().bucket();
        await bucket.file(mediaData.storagePath).delete();
        console.log(`[Media] Deleted storage file: ${mediaData.storagePath}`);
    } catch (storageError) {
        console.warn(`[Media] Storage file deletion warning: ${storageError.message}`);
        // Continue — file may already be deleted (e.g., by image processing function)
    }

    // Delete Firestore document
    await admin.firestore().collection('media').doc(req.params.id).delete();

    res.status(200).json({
        status: 'success',
        message: 'Media deleted successfully'
    });
}));

// ─── GET /api/v1/media/user/me ───────────────────────────────────────
// List authenticated user's uploads with pagination and filters
router.get('/user/me', catchAsync(async (req, res, next) => {
    const queryValidation = MediaQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
        const errors = queryValidation.error.issues.map(i => i.message).join(', ');
        return next(new AppError(errors, 400));
    }

    const { page, limit, category, sort, order } = queryValidation.data;
    const offset = (page - 1) * limit;
    const db = admin.firestore();

    let baseQuery = db.collection('media').where('userId', '==', req.user.uid);

    if (category !== 'all') {
        baseQuery = baseQuery.where('category', '==', category);
    }

    // Get total count
    const countSnapshot = await baseQuery.count().get();
    const total = countSnapshot.data().count;

    // Fetch paginated results
    const snapshot = await baseQuery
        .orderBy(sort, order)
        .limit(limit)
        .offset(offset)
        .get();

    const media = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({
        status: 'success',
        results: media.length,
        data: { media },
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        },
    });
}));

// ─── Multer Error Handler ────────────────────────────────────────────
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File too large. Maximum 50MB allowed.', 400));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new AppError('Too many files. Maximum 5 files per upload.', 400));
        }
        return next(new AppError(`Upload error: ${err.message}`, 400));
    }
    next(err);
});

export default router;
