import express from 'express';
import admin from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { CreateContentSchema } from '../validation/content.schema.js'; // Assuming ES module for schema
import { formatZodErrors } from '../utils/validation.js'; // Assuming ES module for validation utility

const router = express.Router();

// Enums (matching types.ts)
const ContentType = {
    MESSAGE: 'message',
    POST: 'post',
    STORY: 'story'
};

const ContentStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    ARCHIVED: 'archived'
};

const ContentPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

// POST /api/v1/content (Create with Validation)
router.post('/', verifyToken, catchAsync(async (req, res, next) => {
    // Validate request body using Zod
    const validation = CreateContentSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json(formatZodErrors(validation.error));
    }

    const validatedData = validation.data;
    const db = admin.firestore();

    // Prepare document
    const contentData = {
        ...validatedData,
        userId: req.user.uid, // From verifyToken middleware
        title: title.trim(),
        description: description.trim(),
        contentType,
        status,
        priority,
        tags: tags.map(t => t.trim()),
        metadata,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // 3. Persist to Firestore
    // 3. Persist to Firestore
    // db already initialized above
    const docRef = await db.collection('content').add(newContent);

    // Return the ID with the data
    const createdEntity = {
        id: docRef.id,
        ...newContent
    };

    res.status(201).json({
        status: 'success',
        data: {
            content: createdEntity
        }
    });
}));

// GET /api/v1/content (List with Filters and Search)
router.get('/', verifyToken, catchAsync(async (req, res, next) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    const offset = (page - 1) * limit;

    // Filter params
    const statusFilter = req.query.status; // e.g., 'active', 'draft'
    const priorityFilter = req.query.priority; // e.g., 'high', 'low'
    const searchQuery = req.query.q ? req.query.q.toLowerCase().trim() : null;

    const db = admin.firestore();
    const collectionRef = db.collection('content');

    // Base query: scoped to user and not deleted
    let baseQuery = collectionRef
        .where('userId', '==', req.user.uid)
        .where('isDeleted', '==', false);

    // Apply status filter if provided
    if (statusFilter && Object.values(ContentStatus).includes(statusFilter)) {
        baseQuery = baseQuery.where('status', '==', statusFilter);
    }

    // Apply priority filter if provided
    if (priorityFilter && Object.values(ContentPriority).includes(priorityFilter)) {
        baseQuery = baseQuery.where('priority', '==', priorityFilter);
    }

    // Get Total Count (before pagination, after filters)
    const countSnapshot = await baseQuery.count().get();
    const total = countSnapshot.data().count;

    // Apply Sorting & Pagination
    const snapshot = await baseQuery
        .orderBy(sort, order)
        .limit(limit)
        .offset(offset)
        .get();

    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply search filter (client-side due to Firestore limitations)
    // Note: For production, use Algolia or similar service
    if (searchQuery && searchQuery.length >= 2) {
        data = data.filter(item =>
            item.title.toLowerCase().includes(searchQuery) ||
            (item.description && item.description.toLowerCase().includes(searchQuery))
        );
    }

    res.status(200).json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total: searchQuery ? data.length : total, // Adjusted for search
            totalPages: searchQuery ? 1 : Math.ceil(total / limit), // Search returns single page
            hasNext: searchQuery ? false : page * limit < total,
            hasPrev: page > 1
        },
        filters: {
            status: statusFilter || null,
            priority: priorityFilter || null,
            search: searchQuery || null
        }
    });
}));

// GET /api/v1/content/:id (Single)
router.get('/:id', verifyToken, catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const db = admin.firestore();
    const docRef = db.collection('content').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return next(new AppError('Content not found', 404));
    }

    const data = docSnap.data();

    // Soft delete check
    if (data.isDeleted) {
        return next(new AppError('Content not found', 404));
    }

    // Ownership check
    if (data.userId !== req.user.uid) {
        return next(new AppError('You do not have permission to view this content', 403));
    }

    res.status(200).json({
        success: true,
        data: { id: docSnap.id, ...data }
    });
}));

// PUT /api/v1/content/:id (Full Update)
router.put('/:id', verifyToken, catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // Validate request body
    const validation = UpdateContentSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json(formatZodErrors(validation.error));
    }

    const validatedData = validation.data;
    const db = admin.firestore();
    const docRef = db.collection('content').doc(id);

    // Check existence and ownership
    const doc = await docRef.get();
    if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Content not found' });
    }
    if (doc.data().userId !== req.user.uid) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (doc.data().isDeleted) {
        return res.status(404).json({ success: false, message: 'Content not found' });
    }

    // Prepare update (protect immutable fields)
    const updateData = {
        ...validatedData,
        updatedAt: Date.now()
        // Note: userId, createdAt, isDeleted are NOT updated
    };

    await docRef.update(updateData);
    const updated = await docRef.get();

    res.status(200).json({
        success: true,
        data: {
            content: { id: updated.id, ...updated.data() }
        }
    });
}));

// PATCH /api/v1/content/:id (Partial Update)
router.patch('/:id', verifyToken, catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updates = req.body;

    // Protected fields
    delete updates.id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.isDeleted; // Handle delete via DELETE verb usually

    const db = admin.firestore();
    const docRef = db.collection('content').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return next(new AppError('Content not found', 404));
    const currentData = docSnap.data();
    if (currentData.isDeleted) return next(new AppError('Content not found', 404));
    if (currentData.userId !== req.user.uid) return next(new AppError('Permission denied', 403));

    // Validation for provided fields
    if (updates.title && (typeof updates.title !== 'string' || updates.title.length < 3 || updates.title.length > 200)) {
        return next(new AppError('Title must be 3-200 chars', 400));
    }
    // ... additional field validations can be added here

    const finalUpdates = {
        ...updates,
        updatedAt: Date.now()
    };

    // Clean strings if present
    if (finalUpdates.title) finalUpdates.title = finalUpdates.title.trim();
    if (finalUpdates.description) finalUpdates.description = finalUpdates.description.trim();

    await docRef.update(finalUpdates);

    res.status(200).json({
        success: true,
        data: { id, ...currentData, ...finalUpdates }
    });
}));

// DELETE /api/v1/content/:id (Soft Delete)
router.delete('/:id', verifyToken, catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const db = admin.firestore();
    const docRef = db.collection('content').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return next(new AppError('Content not found', 404));

    const data = docSnap.data();
    if (data.userId !== req.user.uid) return next(new AppError('Permission denied', 403));

    if (data.isDeleted) return next(new AppError('Content already deleted', 400));

    await docRef.update({
        isDeleted: true,
        deletedAt: Date.now(),
        updatedAt: Date.now()
    });

    res.status(200).json({
        success: true,
        message: 'Content deleted successfully'
    });
}));

// POST /api/v1/content/:id/restore (Undo Delete)
router.post('/:id/restore', verifyToken, catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const db = admin.firestore();
    const docRef = db.collection('content').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return next(new AppError('Content not found', 404));

    const data = docSnap.data();
    if (data.userId !== req.user.uid) return next(new AppError('Permission denied', 403));

    if (!data.isDeleted) return next(new AppError('Content is not deleted', 400));

    await docRef.update({
        isDeleted: false,
        deletedAt: admin.firestore.FieldValue.delete(),
        updatedAt: Date.now()
    });

    res.status(200).json({
        success: true,
        message: 'Content restored'
    });
}));

export default router;
