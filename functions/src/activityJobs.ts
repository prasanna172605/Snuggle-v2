/**
 * Activity Generation Cloud Functions
 * Server-side activity feed generation
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logger } from './logger';

const db = admin.database();

/**
 * Generate activity when a post is created
 */
export const onPostCreated = functions.database
    .ref('/posts/{postId}')
    .onCreate(async (snapshot, context) => {
        const post = snapshot.val();
        const postId = context.params.postId;

        try {
            // Create activity for post author
            await createActivity({
                userId: post.userId,
                actorId: post.userId,
                actorName: post.username,
                actorAvatar: post.userAvatar,
                action: 'created',
                entityType: 'post',
                entityId: postId,
                entityTitle: post.caption?.substring(0, 50),
            });

            logger.info('Activity created for new post', { postId });
        } catch (error) {
            logger.error('Failed to create post activity', error as Error, { postId });
        }
    });

/**
 * Generate activity when someone comments
 */
export const onCommentCreated = functions.database
    .ref('/comments/{postId}/{commentId}')
    .onCreate(async (snapshot, context) => {
        const comment = snapshot.val();
        const { postId, commentId } = context.params;

        try {
            // Get post to find post owner
            const postSnapshot = await db.ref(`/posts/${postId}`).once('value');
            const post = postSnapshot.val();

            if (!post) return;

            // Don't create activity if commenting on own post
            if (comment.userId === post.userId) return;

            // Create activity for post owner
            await createActivity({
                userId: post.userId,
                actorId: comment.userId,
                actorName: comment.username,
                actorAvatar: comment.userAvatar,
                action: 'commented',
                entityType: 'post',
                entityId: postId,
                entityTitle: post.caption?.substring(0, 50),
                metadata: {
                    commentId,
                    commentText: comment.text?.substring(0, 100),
                },
            });

            logger.info('Activity created for comment', { postId, commentId });
        } catch (error) {
            logger.error('Failed to create comment activity', error as Error);
        }
    });

/**
 * Generate activity when someone follows
 */
export const onFollowCreated = functions.database
    .ref('/followers/{userId}/{followerId}')
    .onCreate(async (snapshot, context) => {
        const { userId, followerId } = context.params;

        try {
            // Get follower info
            const followerSnapshot = await db.ref(`/users/${followerId}`).once('value');
            const follower = followerSnapshot.val();

            if (!follower) return;

            // Create activity for user being followed
            await createActivity({
                userId,
                actorId: followerId,
                actorName: follower.username,
                actorAvatar: follower.avatar,
                action: 'followed',
                entityType: 'user',
                entityId: followerId,
            });

            logger.info('Activity created for follow', { userId, followerId });
        } catch (error) {
            logger.error('Failed to create follow activity', error as Error);
        }
    });

/**
 * Generate activity when someone shares a post
 */
export const onPostShared = functions.database
    .ref('/shares/{postId}/{userId}')
    .onCreate(async (snapshot, context) => {
        const { postId, userId } = context.params;

        try {
            // Get post to find post owner
            const postSnapshot = await db.ref(`/posts/${postId}`).once('value');
            const post = postSnapshot.val();

            if (!post) return;

            // Don't create activity if sharing own post
            if (userId === post.userId) return;

            // Get sharer info
            const sharerSnapshot = await db.ref(`/users/${userId}`).once('value');
            const sharer = sharerSnapshot.val();

            if (!sharer) return;

            // Create activity for post owner
            await createActivity({
                userId: post.userId,
                actorId: userId,
                actorName: sharer.username,
                actorAvatar: sharer.avatar,
                action: 'shared',
                entityType: 'post',
                entityId: postId,
                entityTitle: post.caption?.substring(0, 50),
            });

            logger.info('Activity created for share', { postId, userId });
        } catch (error) {
            logger.error('Failed to create share activity', error as Error);
        }
    });

/**
 * Helper function to create activity entry
 */
async function createActivity(params: {
    userId: string;
    actorId: string;
    actorName?: string;
    actorAvatar?: string;
    action: string;
    entityType: string;
    entityId: string;
    entityTitle?: string;
    metadata?: Record<string, any>;
}): Promise<void> {
    const activityRef = db.ref(`/activity/${params.userId}`).push();

    await activityRef.set({
        actorId: params.actorId,
        actorName: params.actorName,
        actorAvatar: params.actorAvatar,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityTitle: params.entityTitle,
        metadata: params.metadata || null,
        createdAt: admin.database.ServerValue.TIMESTAMP,
    });
}

export default {
    onPostCreated,
    onCommentCreated,
    onFollowCreated,
    onPostShared,
};
