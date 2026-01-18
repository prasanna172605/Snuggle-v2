/**
 * Automated RTDB Backup System
 * Daily exports to Google Cloud Storage
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import { logger } from './logger';

const storage = new Storage();
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || 'snuggle-backups';

/**
 * Scheduled daily RTDB backup
 * Runs at 2 AM UTC (off-peak)
 */
export const dailyRTDBBackup = functions.pubsub
    .schedule('0 2 * * *')
    .timeZone('UTC')
    .onRun(async (context) => {
        const startTime = Date.now();

        try {
            logger.info('Starting daily RTDB backup');

            // Get RTDB reference
            const db = admin.database();
            const snapshot = await db.ref('/').once('value');
            const data = snapshot.val();

            if (!data) {
                logger.warn('No data to backup');
                return;
            }

            // Generate backup path
            const now = new Date();
            const year = now.getUTCFullYear();
            const month = String(now.getUTCMonth() + 1).padStart(2, '0');
            const day = String(now.getUTCDate()).padStart(2, '0');
            const timestamp = now.toISOString().replace(/[:.]/g, '-');

            const backupPath = `rtdb-backups/${year}/${month}/${day}/backup-${timestamp}.json`;

            // Upload to GCS
            const bucket = storage.bucket(BACKUP_BUCKET);
            const file = bucket.file(backupPath);

            await file.save(JSON.stringify(data, null, 2), {
                contentType: 'application/json',
                metadata: {
                    backupDate: now.toISOString(),
                    environment: process.env.GCLOUD_PROJECT,
                    dataSize: JSON.stringify(data).length,
                },
            });

            const duration = Date.now() - startTime;

            logger.info('RTDB backup completed successfully', {
                feature: 'backup',
                backupPath,
                duration,
                dataSize: JSON.stringify(data).length,
            });

            // Cleanup old backups (keep last 30 days)
            await cleanupOldBackups();

        } catch (error) {
            logger.error('RTDB backup failed', error as Error, {
                feature: 'backup',
            });
            throw error;
        }
    });

/**
 * Cleanup backups older than 30 days
 */
async function cleanupOldBackups(): Promise<void> {
    try {
        const bucket = storage.bucket(BACKUP_BUCKET);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        const [files] = await bucket.getFiles({
            prefix: 'rtdb-backups/',
        });

        let deletedCount = 0;

        for (const file of files) {
            const [metadata] = await file.getMetadata();
            const createdTime = new Date(metadata.timeCreated!).getTime();

            if (createdTime < thirtyDaysAgo) {
                await file.delete();
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            logger.info(`Cleaned up ${deletedCount} old backups`);
        }
    } catch (error) {
        logger.error('Backup cleanup failed', error as Error, {
            feature: 'backup',
        });
    }
}

/**
 * Manual backup trigger (for emergencies)
 */
export const manualRTDBBackup = functions.https.onCall(async (data, context) => {
    // Require admin authentication
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can trigger manual backups'
        );
    }

    try {
        logger.info('Manual backup triggered', {
            feature: 'backup',
            userId: context.auth.uid,
        });

        // Trigger backup using pubsub
        await admin.firestore().collection('_backupJobs').add({
            type: 'manual',
            triggeredBy: context.auth.uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
        });

        return { success: true, message: 'Backup initiated' };
    } catch (error) {
        logger.error('Manual backup failed', error as Error);
        throw new functions.https.HttpsError('internal', 'Backup failed');
    }
});

/**
 * List available backups
 */
export const listBackups = functions.https.onCall(async (data, context) => {
    // Require admin authentication
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can list backups'
        );
    }

    try {
        const bucket = storage.bucket(BACKUP_BUCKET);
        const [files] = await bucket.getFiles({
            prefix: 'rtdb-backups/',
        });

        const backups = await Promise.all(
            files.map(async (file) => {
                const [metadata] = await file.getMetadata();
                return {
                    path: file.name,
                    createdAt: metadata.timeCreated,
                    size: metadata.size,
                    environment: metadata.metadata?.environment,
                };
            })
        );

        // Sort by date descending
        backups.sort((a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );

        return { backups };
    } catch (error) {
        logger.error('Failed to list backups', error as Error);
        throw new functions.https.HttpsError('internal', 'Failed to list backups');
    }
});

export default {
    dailyRTDBBackup,
    manualRTDBBackup,
    listBackups,
};
