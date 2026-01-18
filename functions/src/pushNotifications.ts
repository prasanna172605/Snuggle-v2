import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const messaging = admin.messaging();
const firestore = admin.firestore();

interface PushNotificationPayload {
    title: string;
    body: string;
    route?: string;
    entityId?: string;
    type?: string;
}

/**
 * Send push notification to a specific user
 */
export const sendPushNotification = async (
    userId: string,
    payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number }> => {
    try {
        // Get user's FCM tokens
        const tokensSnapshot = await firestore
            .collection("fcmTokens")
            .where("userId", "==", userId)
            .get();

        if (tokensSnapshot.empty) {
            console.log(`No FCM tokens found for user: ${userId}`);
            return { success: true, sentCount: 0 };
        }

        const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
        const tokenDocs = tokensSnapshot.docs;

        // Build FCM message
        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: {
                route: payload.route || "/",
                entityId: payload.entityId || "",
                type: payload.type || "info",
            },
            webpush: {
                fcmOptions: {
                    link: payload.route || "/",
                },
            },
        };

        // Send multicast message
        const response = await messaging.sendEachForMulticast(message);

        console.log(`Successfully sent ${response.successCount} messages`);

        // Remove invalid tokens
        if (response.failureCount > 0) {
            const invalidTokens: Promise<any>[] = [];

            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    if (
                        error?.code === "messaging/invalid-registration-token" ||
                        error?.code === "messaging/registration-token-not-registered"
                    ) {
                        // Delete invalid token
                        invalidTokens.push(tokenDocs[idx].ref.delete());
                    }
                }
            });

            await Promise.all(invalidTokens);
            console.log(`Removed ${invalidTokens.length} invalid tokens`);
        }

        return { success: true, sentCount: response.successCount };
    } catch (error) {
        console.error("Error sending push notification:", error);
        return { success: false, sentCount: 0 };
    }
};

/**
 * Send push to multiple users (batch)
 */
export const sendMulticastPush = async (
    userIds: string[],
    payload: PushNotificationPayload
): Promise<{ success: boolean; totalSent: number }> => {
    try {
        let totalSent = 0;

        // Process in batches of 10 to avoid overwhelming Firestore
        const batchSize = 10;
        for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map((userId) => sendPushNotification(userId, payload))
            );

            totalSent += results.reduce((sum, r) => sum + r.sentCount, 0);
        }

        return { success: true, totalSent };
    } catch (error) {
        console.error("Error sending multicast push:", error);
        return { success: false, totalSent: 0 };
    }
};

/**
 * Cloud Function: Send push when notification is created
 */
export const onNotificationCreate = functions.firestore
    .document("notifications/{notificationId}")
    .onCreate(async (snap) => {
        const notification = snap.data();
        const { userId, title, message, data } = notification;

        console.log(`New notification for user: ${userId}`);

        // Send push notification
        await sendPushNotification(userId, {
            title,
            body: message,
            route: data?.route,
            entityId: data?.entityId,
            type: notification.type,
        });

        return null;
    });
