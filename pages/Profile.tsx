import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Post } from '../types';
import { Settings, Grid, Edit3, Share2, MessageCircle, UserPlus, UserMinus, UserCheck, Camera, Save, X as XIcon, MapPin, Calendar, Link as LinkIcon, Phone, Bookmark, Play, Film, UserSquare2 } from 'lucide-react';
import { DBService } from '../services/database';
import { SkeletonProfile } from '../components/common/Skeleton';

interface ProfileProps {
    user?: User;
    currentUser: User;
    isOwnProfile: boolean;
    onLogout?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user: propUser, currentUser, isOwnProfile, onLogout }) => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(isOwnProfile ? currentUser : null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [showFollowList, setShowFollowList] = useState<'followers' | 'following' | null>(null);
    const [followListUsers, setFollowListUsers] = useState<User[]>([]);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const [editError, setEditError] = useState('');
    const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved' | 'tagged'>('posts');
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                let targetUser: User | null = null;
                if (userId && !isOwnProfile) {
                    targetUser = await DBService.getUserById(userId);
                    setUser(targetUser);

                    if (currentUser && targetUser) {
                        const following = await DBService.isFollowing(currentUser.id, targetUser.id);
                        setIsFollowing(following);
                    }
                } else if (isOwnProfile && currentUser) {
                    setUser(currentUser);
                    targetUser = currentUser;
                    setEditForm(currentUser); // Initialize edit form
                }

                if (targetUser) {
                    const posts = await DBService.getUserPosts(targetUser.id);
                    setUserPosts(posts);
                }
            } catch (error) {
                console.error("Error loading profile:", error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [userId, currentUser, isOwnProfile]);

    const handleFollowToggle = async () => {
        if (!currentUser || !user) return;
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await DBService.unfollowUser(currentUser.id, user.id);
                setIsFollowing(false);
            } else {
                await DBService.followUser(currentUser.id, user.id);
                setIsFollowing(true);
            }
        } catch (error: any) {
            console.error('Follow error:', error);
            alert(error.message || 'Action failed');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreviewAvatar(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        setEditError('');

        try {
            // 1. Upload Avatar if changed
            let avatarUrl = user.avatar;
            if (avatarFile) {
                avatarUrl = await DBService.uploadAvatar(user.id, avatarFile);

                // Update via API
                const token = await DBService.getCurrentToken();
                await fetch('/api/v1/users/me/avatar', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ avatarUrl })
                });
            }

            // 2. Update Profile Data
            const token = await DBService.getCurrentToken();
            const response = await fetch('/api/v1/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...editForm,
                    avatar: avatarUrl // Optimistically included, though PATCH handles it separately usually
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to update profile');
            }

            const data = await response.json();
            const updatedUser = data.data.user; // Assuming response structure

            setUser(updatedUser);
            // Also update local session to reflect changes immediately
            if (isOwnProfile) {
                // currentUser props might be stale until parent updates, 
                // but we can rely on local state 'user' for now.
                // Optionally trigger a re-fetch or parent callback if needed.
            }
            setIsEditing(false);
        } catch (err: any) {
            console.error(err);
            setEditError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const openFollowList = async (type: 'followers' | 'following') => {
        if (!user) return;
        setShowFollowList(type);
        setFollowListUsers([]); // Reset while loading
        const ids = type === 'followers' ? user.followers : user.following;
        if (ids && ids.length > 0) {
            const users = await DBService.getUsersByIds(ids);
            setFollowListUsers(users);
        }
    };

    // ... (inside component)

    if (loading || !user) return <div className="p-4 pt-10"><SkeletonProfile /></div>;

    // --- Edit Mode UI ---
    if (isEditing) {
        return (
            <div className="pb-28 pt-2 px-2 relative min-h-screen bg-snuggle-50">
                <div className="bg-white rounded-bento p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Edit Profile</h2>
                        <button onClick={() => setIsEditing(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-6 relative">
                        <div className="w-28 h-28 rounded-[36px] bg-gray-100 mb-4 relative overflow-hidden group">
                            <img src={previewAvatar || user.avatar} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                        <button onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-snuggle-500">Change Photo</button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-3">Full Name</label>
                            <input
                                type="text"
                                value={editForm.fullName || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                                className="w-full bg-gray-50 rounded-xl p-3 font-bold text-gray-900 border-2 border-transparent focus:border-snuggle-100 focus:bg-white transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-3">Bio</label>
                            <textarea
                                value={editForm.bio || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                className="w-full bg-gray-50 rounded-xl p-3 text-sm font-medium text-gray-900 border-2 border-transparent focus:border-snuggle-100 focus:bg-white transition-all outline-none h-24 resize-none"
                                maxLength={500}
                                placeholder="Tell us about yourself..."
                            />
                            <div className="text-right text-[10px] text-gray-400 font-bold pr-2">{editForm.bio?.length || 0}/500</div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-3">Location</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={editForm.location?.city || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, location: { ...prev.location, city: e.target.value, country: prev.location?.country } }))}
                                    className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold border-2 border-transparent focus:border-snuggle-100 focus:bg-white outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Country"
                                    value={editForm.location?.country || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, location: { ...prev.location, country: e.target.value, city: prev.location?.city } }))}
                                    className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold border-2 border-transparent focus:border-snuggle-100 focus:bg-white outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-3">Date of Birth</label>
                            <input
                                type="date"
                                value={editForm.dateOfBirth || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold text-gray-900 border-2 border-transparent focus:border-snuggle-100 focus:bg-white transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-3">Phone</label>
                            <input
                                type="tel"
                                value={editForm.phone || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold text-gray-900 border-2 border-transparent focus:border-snuggle-100 focus:bg-white transition-all outline-none"
                                placeholder="+1 234 567 8900"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-3">Website</label>
                            <input
                                type="url"
                                value={editForm.socialLinks?.website || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, website: e.target.value } }))}
                                className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold text-gray-900 border-2 border-transparent focus:border-snuggle-100 focus:bg-white transition-all outline-none"
                                placeholder="https://..."
                            />
                        </div>

                        {editError && (
                            <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl text-center">
                                {editError}
                            </div>
                        )}

                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-800 active:scale-95 transition-all flex justify-center items-center gap-2"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- View Mode UI (Instagram-like) ---
    return (
        <div className="pb-28 relative bg-white dark:bg-black min-h-screen">
            {/* Header with Settings */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-border">
                <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
                    {isOwnProfile && (
                        <button onClick={() => navigate('/settings')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <Settings className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4">
                {/* Profile Header - Horizontal Layout */}
                <div className="py-6 flex items-start gap-6 md:gap-10">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="w-20 h-20 md:w-36 md:h-36 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 p-1 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500">
                            <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover bg-gray-200" />
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 min-w-0">
                        {/* Username and Actions */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.username}</h2>
                            {isOwnProfile ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Edit profile
                                    </button>
                                    <button
                                        className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        View archive
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleFollowToggle}
                                        disabled={followLoading}
                                        className={`px-6 py-1.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${isFollowing
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                    >
                                        {followLoading ? (
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                    <button
                                        onClick={() => navigate(`/chat/${user.id}`)}
                                        className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Message
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Stats Row */}
                        <div className="hidden md:flex gap-8 mb-4">
                            <div className="text-center">
                                <span className="font-bold text-gray-900 dark:text-white">{userPosts.length}</span>
                                <span className="text-gray-500 ml-1">posts</span>
                            </div>
                            <div
                                className="cursor-pointer hover:opacity-70"
                                onClick={() => openFollowList('followers')}
                            >
                                <span className="font-bold text-gray-900 dark:text-white">{user.followers?.length || 0}</span>
                                <span className="text-gray-500 ml-1">followers</span>
                            </div>
                            <div
                                className="cursor-pointer hover:opacity-70"
                                onClick={() => openFollowList('following')}
                            >
                                <span className="font-bold text-gray-900 dark:text-white">{user.following?.length || 0}</span>
                                <span className="text-gray-500 ml-1">following</span>
                            </div>
                        </div>

                        {/* Bio (Desktop) */}
                        <div className="hidden md:block">
                            <p className="font-semibold text-gray-900 dark:text-white">{user.fullName}</p>
                            {user.bio && <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">{user.bio}</p>}
                            {user.socialLinks?.website && (
                                <a href={user.socialLinks.website} target="_blank" className="text-blue-900 dark:text-blue-400 font-semibold text-sm hover:underline">
                                    {user.socialLinks.website.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bio (Mobile) */}
                <div className="md:hidden pb-4 border-b border-gray-100 dark:border-dark-border">
                    <p className="font-semibold text-gray-900 dark:text-white">{user.fullName}</p>
                    {user.bio && <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">{user.bio}</p>}
                    {user.socialLinks?.website && (
                        <a href={user.socialLinks.website} target="_blank" className="text-blue-900 dark:text-blue-400 font-semibold text-sm hover:underline">
                            {user.socialLinks.website.replace(/^https?:\/\//, '')}
                        </a>
                    )}
                </div>

                {/* Stats Row (Mobile) */}
                <div className="md:hidden py-3 grid grid-cols-3 border-b border-gray-100 dark:border-dark-border">
                    <div className="text-center">
                        <span className="block font-bold text-gray-900 dark:text-white">{userPosts.length}</span>
                        <span className="text-xs text-gray-500">posts</span>
                    </div>
                    <div
                        className="text-center cursor-pointer"
                        onClick={() => openFollowList('followers')}
                    >
                        <span className="block font-bold text-gray-900 dark:text-white">{user.followers?.length || 0}</span>
                        <span className="text-xs text-gray-500">followers</span>
                    </div>
                    <div
                        className="text-center cursor-pointer"
                        onClick={() => openFollowList('following')}
                    >
                        <span className="block font-bold text-gray-900 dark:text-white">{user.following?.length || 0}</span>
                        <span className="text-xs text-gray-500">following</span>
                    </div>
                </div>

                {/* Story Highlights (Placeholder) */}
                <div className="py-4 flex gap-4 overflow-x-auto scrollbar-hide">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                            <span className="text-2xl">+</span>
                        </div>
                        <span className="text-xs text-gray-500">New</span>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex border-t border-b border-gray-100 dark:border-dark-border">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-3 flex justify-center items-center gap-1 border-t-2 -mt-px transition-colors ${activeTab === 'posts'
                                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                                : 'border-transparent text-gray-400'
                            }`}
                    >
                        <Grid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setActiveTab('reels')}
                        className={`flex-1 py-3 flex justify-center items-center gap-1 border-t-2 -mt-px transition-colors ${activeTab === 'reels'
                                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                                : 'border-transparent text-gray-400'
                            }`}
                    >
                        <Film className="w-5 h-5" />
                    </button>
                    {isOwnProfile && (
                        <button
                            onClick={() => setActiveTab('saved')}
                            className={`flex-1 py-3 flex justify-center items-center gap-1 border-t-2 -mt-px transition-colors ${activeTab === 'saved'
                                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                                    : 'border-transparent text-gray-400'
                                }`}
                        >
                            <Bookmark className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('tagged')}
                        className={`flex-1 py-3 flex justify-center items-center gap-1 border-t-2 -mt-px transition-colors ${activeTab === 'tagged'
                                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                                : 'border-transparent text-gray-400'
                            }`}
                    >
                        <UserSquare2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Posts Grid - 3 Columns */}
                <div className="grid grid-cols-3 gap-0.5 md:gap-1">
                    {activeTab === 'posts' && userPosts.map(post => (
                        <div key={post.id} className="aspect-square relative group cursor-pointer">
                            {post.mediaType === 'video' ? (
                                <>
                                    <video src={post.imageUrl} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2">
                                        <Play className="w-5 h-5 text-white fill-white drop-shadow-lg" />
                                    </div>
                                </>
                            ) : (
                                <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                                <div className="flex items-center gap-1 text-white font-bold">
                                    <span>❤️</span>
                                    <span>{Array.isArray(post.likes) ? post.likes.length : post.likes}</span>
                                </div>
                                <div className="flex items-center gap-1 text-white font-bold">
                                    <span>💬</span>
                                    <span>{post.comments}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {activeTab === 'reels' && (
                        <div className="col-span-3 py-12 text-center text-gray-400">
                            <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No reels yet</p>
                        </div>
                    )}
                    {activeTab === 'saved' && isOwnProfile && (
                        <div className="col-span-3 py-12 text-center text-gray-400">
                            <Bookmark className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Only you can see what you've saved</p>
                        </div>
                    )}
                    {activeTab === 'tagged' && (
                        <div className="col-span-3 py-12 text-center text-gray-400">
                            <UserSquare2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No tagged posts</p>
                        </div>
                    )}
                    {activeTab === 'posts' && userPosts.length === 0 && (
                        <div className="col-span-3 py-12 text-center text-gray-400">
                            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">Share Photos</h3>
                            <p className="text-sm">When you share photos, they will appear on your profile.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Follow List Modal */}
            {showFollowList && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-dark-card w-full max-w-sm rounded-[32px] overflow-hidden max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
                        <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                            <h3 className="font-bold text-lg capitalize">{showFollowList}</h3>
                            <button onClick={() => setShowFollowList(null)} className="p-2 bg-gray-100 dark:bg-dark-bg rounded-full hover:bg-gray-200">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3">
                            {followListUsers.map(u => (
                                <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-dark-bg rounded-xl cursor-pointer" onClick={() => { navigate(`/profile/${u.id}`); setShowFollowList(null); }}>
                                    <img src={u.avatar} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{u.fullName}</p>
                                        <p className="text-xs text-gray-500">@{u.username}</p>
                                    </div>
                                </div>
                            ))}
                            {followListUsers.length === 0 && (
                                <p className="text-center text-gray-400 py-8 text-sm">No users found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
