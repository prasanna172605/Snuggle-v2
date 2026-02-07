import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import { DBService } from '../services/database';
import { ArrowLeft, Heart, MessageSquare, Reply, Star, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

interface ActivitiesProps {
    currentUser: User;
    onBack?: () => void;
}

type ActivityTab = 'likes' | 'comments' | 'replies';

interface ActivityItem {
    id: string;
    postId: string;
    postImage: string;
    timestamp: Date;
    type: 'like' | 'comment' | 'reply';
}

const Activities: React.FC<ActivitiesProps> = ({ currentUser, onBack }) => {
    const [activeTab, setActiveTab] = useState<ActivityTab>('likes');
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivities();
    }, [activeTab]);

    const loadActivities = async () => {
        setLoading(true);
        // TODO: Implement DBService methods for getting user activities
        // For now, using mock data
        setTimeout(() => {
            setActivities([]);
            setLoading(false);
        }, 500);
    };

    const tabs = [
        { id: 'likes' as ActivityTab, label: 'Likes', icon: Heart },
        { id: 'comments' as ActivityTab, label: 'Comments', icon: MessageSquare },
        { id: 'replies' as ActivityTab, label: 'Story Replies', icon: Reply },
    ];

    const menuItems = [
        { icon: ChevronRight, label: 'Interactions', desc: 'Review and delete likes, comments, and your other interactions' },
        { icon: ChevronRight, label: 'Photos & Videos', desc: 'View, archive or delete photos and videos you\'ve shared.' },
        { icon: ChevronRight, label: 'Account History', desc: 'Review changes you\'ve made to your account since you created it.' },
    ];

    return (
        <div className="h-full bg-white dark:bg-black overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-4 px-4 py-4">
                    {onBack && (
                        <button onClick={onBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    <h1 className="text-xl font-bold">Your Activity</h1>
                </div>
            </div>

            <div className="flex flex-col md:flex-row h-[calc(100%-65px)]">
                {/* Left Sidebar */}
                <div className="md:w-72 border-r border-gray-100 dark:border-dark-border p-4 flex-shrink-0">
                    <div className="space-y-2">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                            >
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{item.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                                </div>
                                <item.icon className="w-5 h-5 text-gray-400" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-dark-border sticky top-0 bg-white dark:bg-black">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab.id
                                        ? 'border-black dark:border-white text-black dark:text-white'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Sort & Filter */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                        <div className="flex gap-4">
                            <button className="text-sm font-semibold">Newest to oldest</button>
                            <button className="text-sm font-semibold text-gray-400">Sort & filter</button>
                        </div>
                        <button className="text-sm font-semibold text-snuggle-500">Select</button>
                    </div>

                    {/* Content Grid */}
                    <div className="p-4">
                        {loading ? (
                            <div className="grid grid-cols-3 gap-1">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                                ))}
                            </div>
                        ) : activities.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1">
                                {activities.map(activity => (
                                    <div key={activity.id} className="aspect-square relative group cursor-pointer">
                                        <img src={activity.postImage} className="w-full h-full object-cover rounded-lg" alt="" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <span className="text-white text-sm">{formatRelativeTime(activity.timestamp)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-400">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    {activeTab === 'likes' && <Heart className="w-8 h-8" />}
                                    {activeTab === 'comments' && <MessageSquare className="w-8 h-8" />}
                                    {activeTab === 'replies' && <Reply className="w-8 h-8" />}
                                </div>
                                <p className="font-semibold">No {activeTab} yet</p>
                                <p className="text-sm">When you {activeTab === 'likes' ? 'like' : activeTab === 'comments' ? 'comment on' : 'reply to'} posts, they'll appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Activities;
