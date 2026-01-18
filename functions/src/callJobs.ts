import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const rtdb = admin.database();
const firestore = admin.firestore();

/**
 * Trigger when a call is missed (30 seconds after ringing)
 */
export const onCallTimeout = functions.database
    .ref("/calls/{callId}")
    .onUpdate(async (change, context) => {
        const callId = context.params.callId;
        const before = change.before.val();
        const after = change.after.val();

        // Check if call is still ringing after 30 seconds
        if (
            after.status === "ringing" &&
            Date.now() - after.createdAt > 30000
        ) {
            console.log(`Call ${callId} timed out`);

            // Update call status to missed
            await change.after.ref.update({
                status: "missed",
                endedAt: Date.now(),
            });

            // Create missed call notification
            await firestore.collection("notifications").add({
                userId: after.receiverId,
                type: "missed_call",
                title: "Missed Call",
                message: `You missed a ${after.type} call`,
                data: {
                    callerId: after.callerId,
                    callType: after.type,
                    timestamp: after.createdAt,
                },
                isRead: false,
                createdAt: Date.now(),
            });

            console.log(`Created missed call notification for ${after.receiverId}`);
        }

        return null;
    });

/**
 * Cleanup call data when call ends
 */
export const onCallEnded = functions.database
    .ref("/calls/{callId}")
    .onUpdate(async (change, context) => {
        const callId = context.params.callId;
        const after = change.after.val();

        // Only process when status changes to ended
        if (after.status === "ended") {
            console.log(`Call ${callId} ended, scheduling cleanup`);

            // Schedule cleanup after 1 hour (prevent immediate deletion for debugging)
            const cleanupTime = Date.now() + (60 * 60 * 1000);

            // Store cleanup job
            await rtdb.ref(`jobs/cleanup_call_${callId}`).set({
                type: "cleanup_call",
                callId,
                status: "pending",
                scheduledFor: cleanupTime,
                createdAt: Date.now(),
            });

            console.log(`Scheduled cleanup for call ${callId} at ${cleanupTime}`);
        }

        return null;
    });

/**
 * Process cleanup jobs
 */
export const processCleanupJobs = functions.pubsub
    .schedule("*/15 * * * *") // Every 15 minutes
    .timeZone("UTC")
    .onRun(async (context) => {
        console.log("Processing cleanup jobs");

        const now = Date.now();
        const jobsRef = rtdb.ref("jobs");

        try {
            // Get pending jobs that are due
            const snapshot = await jobsRef
                .orderByChild("status")
                .equalTo("pending")
                .once("value");

            if (!snapshot.exists()) {
                console.log("No pending jobs");
                return null;
            }

            const jobs = snapshot.val();
            const updates: { [key: string]: any } = {};
            let processedCount = 0;

            for (const jobId of Object.keys(jobs)) {
                const job = jobs[jobId];

                if (job.scheduledFor <= now) {
                    console.log(`Processing job: ${jobId}`);

                    if (job.type === "cleanup_call") {
                        // Delete call and signal data
                        updates[`calls/${job.callId}`] = null;
                        updates[`callSignals/${job.callId}`] = null;

                        // Mark job as completed
                        updates[`jobs/${jobId}/status`] = "completed";
                        updates[`jobs/${jobId}/completedAt`] = now;

                        processedCount++;
                    }
                }
            }

            if (processedCount > 0) {
                await rtdb.ref().update(updates);
                console.log(`Processed ${processedCount} cleanup jobs`);
            }

            return { success: true, processedCount };
        } catch (error) {
            console.error("Error processing cleanup jobs:", error);
            throw error;
        }
    });
