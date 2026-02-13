/**
 * Ownership Authorization Middleware
 * Verifies that the authenticated user owns the resource before allowing mutations
 */

import admin from '../config/firebase.js';
import AppError from '../utils/AppError.js';

/**
 * Check that req.user.uid matches the document's userId field
 * @param {string} collectionName - Firestore collection to look up
 * @param {string} [paramName='id'] - Route param that holds the document ID
 */
export const checkOwnership = (collectionName, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const docId = req.params[paramName];
            if (!docId) {
                return next(new AppError('Resource ID is required', 400));
            }

            const db = admin.firestore();
            const docRef = db.collection(collectionName).doc(docId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                return next(new AppError('Resource not found', 404));
            }

            const data = docSnap.data();

            if (data.userId !== req.user.uid) {
                return next(new AppError('You do not have permission to modify this resource', 403));
            }

            // Attach the document data to the request for downstream use
            req.resourceDoc = { id: docSnap.id, ...data };
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Check ownership OR allow admin bypass
 * Admins (role === 'admin') can modify any resource
 * @param {string} collectionName - Firestore collection to look up
 * @param {string} [paramName='id'] - Route param that holds the document ID
 */
export const checkOwnershipOrAdmin = (collectionName, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const docId = req.params[paramName];
            if (!docId) {
                return next(new AppError('Resource ID is required', 400));
            }

            const db = admin.firestore();
            const docRef = db.collection(collectionName).doc(docId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                return next(new AppError('Resource not found', 404));
            }

            const data = docSnap.data();
            const isOwner = data.userId === req.user.uid;
            const isAdmin = req.user.role === 'admin';

            if (!isOwner && !isAdmin) {
                return next(new AppError('You do not have permission to modify this resource', 403));
            }

            req.resourceDoc = { id: docSnap.id, ...data };
            next();
        } catch (error) {
            next(error);
        }
    };
};

export default { checkOwnership, checkOwnershipOrAdmin };
