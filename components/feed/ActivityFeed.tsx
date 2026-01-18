import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { activityFeedService, Activity, GroupedActivity } from '@/services/activityFeedService';
import { formatDistanceToNow } from 'date-fns';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Activity as ActivityIcon, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActivityFeed() {
    const { currentUser } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [groupedActivities, setGroupedActivities] = useState<GroupedActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        setIsLoading(true);

        // Subscribe to recent activities (real-time)
        const unsubscribe = activityFeedService.subscribeToRecentActivities(
            currentUser.uid,
            30,
            (newActivities) => {
                setActivities(newActivities);
                setGroupedActivities(activityFeedService.groupActivities(newActivities));
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    const loadMore = async () => {
        if (!currentUser || activities.length === 0) return;

        const oldestActivity = activities[activities.length - 1];
        const olderActivities = await activityFeedService.loadOlderActivities(
            currentUser.uid,
            oldestActivity.createdAt,
            20
        );

        if (olderActivities.length === 0) {
            setHasMore(false);
            return;
        }

        const combined = [...activities, ...olderActivities];
        setActivities(combined);
        setGroupedActivities(activityFeedService.groupActivities(combined));
    };

    const groupedByDate = activityFeedService.groupByDate(activities);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner text="Loading activities..." />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <EmptyState
                icon={ActivityIcon}
                title="No recent activity"
                description="When people interact with your content, you'll see it here"
            />
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {Object.entries(groupedByDate).map(([dateLabel, dateActivities]) => (
                <div key={dateLabel}>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                        {dateLabel}
                    </h3>
                    <div className="space-y-3">
                        {dateActivities.map(activity => {
                            const grouped = groupedActivities.find(g => g.id === activity.id);
                            return grouped ? (
                                <GroupedActivityItem key={activity.id} activity={grouped} />
                            ) : (
                                <ActivityItem key={activity.id} activity={activity} />
                            );
                        })}
                    </div>
                </div>
            ))}

            {hasMore && (
                <button
                    onClick={loadMore}
                    className="w-full py-3 text-cyan-600 hover:text-cyan-700 font-medium"
                >
                    Load more
                </button>
            )}
        </div>
    );
}

function ActivityItem({ activity }: { activity: Activity }) {
    const text = activityFeedService.getActivityText(activity);

    return (
        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                {activity.actorAvatar ? (
                    <img src={activity.actorAvatar} alt={activity.actorName} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <ActivityIcon className="w-5 h-5" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                    {text}
                </p>
                {activity.entityTitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                        "{activity.entityTitle}"
                    </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                </p>
            </div>
        </div>
    );
}

function GroupedActivityItem({ activity }: { activity: GroupedActivity }) {
    const text = activityFeedService.getActivityText(activity);

    return (
        <div className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <div className="flex -space-x-2 flex-shrink-0">
                {activity.actors.slice(0, 3).map((actor, i) => (
                    <div
                        key={actor.id}
                        className={cn(
                            'w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 overflow-hidden',
                            i > 0 && 'ml-[-8px]'
                        )}
                    >
                        {actor.avatar ? (
                            <img src={actor.avatar} alt={actor.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <Users className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                    {text}
                </p>
                {activity.entityTitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                        "{activity.entityTitle}"
                    </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                </p>
            </div>
        </div>
    );
}

export default ActivityFeed;
