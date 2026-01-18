/**
 * Activity Feed Service
 * Manages user activity timeline
 */

import { database } from './firebase';
import { ref, query, orderByChild, limitToLast, endBefore, get, onValue } from 'firebase/database';

export type ActivityAction =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'commented'
    | 'shared'
    | 'reacted'
    | 'followed'
    | 'status_changed';

export type EntityType = 'post' | 'story' | 'media' | 'comment' | 'user' | 'status';

export interface Activity {
    id: string;
    actorId: string;
    actorName?: string;
    actorAvatar?: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId: string;
    entityTitle?: string;
    metadata?: Record<string, any>;
    createdAt: number;
}

export interface GroupedActivity {
    id: string;
    actors: Array<{ id: string; name: string; avatar?: string }>;
    action: ActivityAction;
    entityType: EntityType;
    entityId: string;
    entityTitle?: string;
    count: number;
    createdAt: number;
}

/**
 * Activity Feed Service
 */
class ActivityFeedService {
    /**
     * Subscribe to recent activities (real-time)
     */
    subscribeToRecentActivities(
        userId: string,
        limit: number = 20,
        callback: (activities: Activity[]) => void
    ): () => void {
        const activitiesRef = ref(database, `activity/${userId}`);
        const activitiesQuery = query(
            activitiesRef,
            orderByChild('createdAt'),
            limitToLast(limit)
        );

        const unsubscribe = onValue(activitiesQuery, (snapshot) => {
            const data = snapshot.val() || {};
            const activities: Activity[] = Object.entries(data).map(([id, activity]) => ({
                id,
                ...(activity as Omit<Activity, 'id'>),
            }));

            // Sort by createdAt descending
            activities.sort((a, b) => b.createdAt - a.createdAt);

            callback(activities);
        });

        return unsubscribe;
    }

    /**
     * Load older activities (pagination)
     */
    async loadOlderActivities(
        userId: string,
        beforeTimestamp: number,
        limit: number = 20
    ): Promise<Activity[]> {
        const activitiesRef = ref(database, `activity/${userId}`);
        const activitiesQuery = query(
            activitiesRef,
            orderByChild('createdAt'),
            endBefore(beforeTimestamp),
            limitToLast(limit)
        );

        const snapshot = await get(activitiesQuery);
        const data = snapshot.val() || {};

        const activities: Activity[] = Object.entries(data).map(([id, activity]) => ({
            id,
            ...(activity as Omit<Activity, 'id'>),
        }));

        // Sort by createdAt descending
        activities.sort((a, b) => b.createdAt - a.createdAt);

        return activities;
    }

    /**
     * Group similar activities (e.g., "X and 3 others liked your post")
     */
    groupActivities(activities: Activity[]): GroupedActivity[] {
        const grouped = new Map<string, GroupedActivity>();

        activities.forEach(activity => {
            const key = `${activity.action}_${activity.entityType}_${activity.entityId}`;

            if (grouped.has(key)) {
                const existing = grouped.get(key)!;
                existing.actors.push({
                    id: activity.actorId,
                    name: activity.actorName || 'User',
                    avatar: activity.actorAvatar,
                });
                existing.count++;
                // Keep most recent timestamp
                if (activity.createdAt > existing.createdAt) {
                    existing.createdAt = activity.createdAt;
                }
            } else {
                grouped.set(key, {
                    id: activity.id,
                    actors: [{
                        id: activity.actorId,
                        name: activity.actorName || 'User',
                        avatar: activity.actorAvatar,
                    }],
                    action: activity.action,
                    entityType: activity.entityType,
                    entityId: activity.entityId,
                    entityTitle: activity.entityTitle,
                    count: 1,
                    createdAt: activity.createdAt,
                });
            }
        });

        return Array.from(grouped.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Group activities by date
     */
    groupByDate(activities: Activity[]): Record<string, Activity[]> {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;

        const groups: Record<string, Activity[]> = {
            Today: [],
            Yesterday: [],
            'This Week': [],
            Older: [],
        };

        activities.forEach(activity => {
            if (activity.createdAt >= today) {
                groups.Today.push(activity);
            } else if (activity.createdAt >= yesterday) {
                groups.Yesterday.push(activity);
            } else if (activity.createdAt >= today - 7 * 86400000) {
                groups['This Week'].push(activity);
            } else {
                groups.Older.push(activity);
            }
        });

        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });

        return groups;
    }

    /**
     * Format activity text
     */
    getActivityText(activity: Activity | GroupedActivity): string {
        const isGrouped = 'actors' in activity;

        if (isGrouped) {
            const { actors, action, entityType, count } = activity as GroupedActivity;

            if (count === 1) {
                return `${actors[0].name} ${this.getActionText(action, entityType)}`;
            } else if (count === 2) {
                return `${actors[0].name} and ${actors[1].name} ${this.getActionText(action, entityType)}`;
            } else {
                return `${actors[0].name} and ${count - 1} others ${this.getActionText(action, entityType)}`;
            }
        } else {
            const { actorName, action, entityType } = activity as Activity;
            return `${actorName || 'Someone'} ${this.getActionText(action, entityType)}`;
        }
    }

    /**
     * Get action text
     */
    private getActionText(action: ActivityAction, entityType: EntityType): string {
        const actionMap: Record<ActivityAction, string> = {
            created: `created a ${entityType}`,
            updated: `updated a ${entityType}`,
            deleted: `deleted a ${entityType}`,
            commented: `commented on your ${entityType}`,
            shared: `shared your ${entityType}`,
            reacted: `reacted to your ${entityType}`,
            followed: 'started following you',
            status_changed: 'updated their status',
        };

        return actionMap[action] || `performed ${action}`;
    }
}

export const activityFeedService = new ActivityFeedService();
export default activityFeedService;
