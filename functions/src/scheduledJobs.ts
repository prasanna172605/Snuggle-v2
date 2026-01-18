import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const firestore = admin.firestore();
const rtdb = admin.database();

/**
 * Daily cleanup of expired stories (runs at 2 AM UTC)
 */
export const cleanupExpiredStories = functions.pubsub
    .schedule("0 2 * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
        console.log("Starting expired stories cleanup");

        const now = Date.now();
        const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

        try {
            // Get expired stories from Firestore
            const expiredStories = await firestore
                .collection("stories")
                .where("createdAt", "<", now - expirationTime)
                .get();

            if (expiredStories.empty) {
                console.log("No expired stories found");
                return null;
            }

            // Delete in batches
            const batch = firestore.batch();
            let count = 0;

            expiredStories.docs.forEach((doc) => {
                batch.delete(doc.ref);
                count++;
            });

            await batch.commit();
            console.log(`Deleted ${count} expired stories`);

            return { success: true, deletedCount: count };
        } catch (error) {
            console.error("Error cleaning up stories:", error);
            throw error;
        }
    });

/**
 * Daily cleanup of old notifications (runs at 3 AM UTC)
 */
export const cleanupOldNotifications = functions.pubsub
    .schedule("0 3 * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
        console.log("Starting old notifications cleanup");

        const now = Date.now();
        const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

        try {
            // Get old notifications
            const oldNotifications = await firestore
                .collection("notifications")
                .where("createdAt", "<", now - retentionPeriod)
                .get();

            if (oldNotifications.empty) {
                console.log("No old notifications to clean up");
                return null;
            }

            // Delete in batches
            const batch = firestore.batch();
            let count = 0;

            oldNotifications.docs.forEach((doc) => {
                batch.delete(doc.ref);
                count++;
            });

            await batch.commit();
            console.log(`Deleted ${count} old notifications`);

            return { success: true, deletedCount: count };
        } catch (error) {
            console.error("Error cleaning up notifications:", error);
            throw error;
        }
    });

/**
 * Hourly cleanup of ended call sessions
 */
export const cleanupCallSessions = functions.pubsub
    .schedule("0 * * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
        console.log("Starting call sessions cleanup");

        const now = Date.now();
        const cleanupThreshold = 1 * 60 * 60 * 1000; // 1 hour

        try {
            // Get ended calls older than 1 hour from RTDB
            const callsRef = rtdb.ref("calls");
            const snapshot = await callsRef
                .orderByChild("status")
                .equalTo("ended")
                .once("value");

            if (!snapshot.exists()) {
                console.log("No ended calls to clean up");
                return null;
            }

            const calls = snapshot.val();
            const updates: { [key: string]: null } = {};
            let count = 0;

            Object.keys(calls).forEach((callId) => {
                const call = calls[callId];
                if (call.createdAt && now - call.createdAt > cleanupThreshold) {
                    // Remove call data
                    updates[`calls/${callId}`] = null;
                    updates[`callSignals/${callId}`] = null;
                    count++;
                }
            });

            if (count > 0) {
                await rtdb.ref().update(updates);
                console.log(`Cleaned up ${count} ended call sessions`);
            }

            return { success: true, deletedCount: count };
        } catch (error) {
            console.error("Error cleaning up call sessions:", error);
            throw error;
        }
    });

/**
 * Weekly cleanup of inactive FCM tokens (runs Sunday at 1 AM)
 */
export const cleanupInactiveTokens = functions.pubsub
    .schedule("0 1 * * 0")
    .timeZone("UTC")
    .onRun(async (context) => {
        console.log("Starting inactive tokens cleanup");

        const now = Date.now();
        const inactivityThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days

        try {
            // Get inactive tokens
            const inactiveTokens = await firestore
                .collection("fcmTokens")
                .where("lastActiveAt", "<", now - inactivityThreshold)
                .get();

            if (inactiveTokens.empty) {
                console.log("No inactive tokens to clean up");
                return null;
            }

            // Delete in batches
            const batch = firestore.batch();
            let count = 0;

            inactiveTokens.docs.forEach((doc) => {
                batch.delete(doc.ref);
                count++;
            });

            await batch.commit();
            console.log(`Deleted ${count} inactive FCM tokens`);

            return { success: true, deletedCount: count };
        } catch (error) {
            console.error("Error cleaning up inactive tokens:", error);
            throw error;
        }
    });
