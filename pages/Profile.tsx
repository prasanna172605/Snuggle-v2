import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Post } from '../types';
import { Settings, Grid, Edit3, Share2, MessageCircle, UserPlus, UserMinus, UserCheck, Camera, Save, X as XIcon, MapPin, Calendar, Link as LinkIcon, Phone } from 'lucide-react';
import { DBService } from '../services/database';

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

    if (loading || !user) {
        return (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
            </div>
        );
    }

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

    // --- View Mode UI (Existing with small enhancements) ---
    return (
        <div className="pb-28 pt-2 px-2 relative">
            <div className="grid grid-cols-2 gap-2">

                {/* Main Profile Card */}
                <div className="col-span-2 bg-white dark:bg-dark-card rounded-bento p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden transition-colors border border-transparent dark:border-dark-border">
                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 opacity-50" />

                    <div className="relative z-10 mt-4">
                        <div className="w-28 h-28 rounded-[36px] p-1.5 bg-white dark:bg-dark-card shadow-sm mb-4">
                            <img src={user.avatar} alt={user.username} className="w-full h-full rounded-[30px] object-cover" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{user.fullName}</h2>
                        <p className="text-gray-400 font-medium text-sm">@{user.username}</p>

                        {/* New Info Badges */}
                        <div className="flex flex-wrap gap-2 justify-center mt-3">
                            {user.location?.city && (
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                    <MapPin className="w-3 h-3" /> {user.location.city}, {user.location.country}
                                </div>
                            )}
                            {user.socialLinks?.website && (
                                <a href={user.socialLinks.website} target="_blank" className="flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg hover:underline">
                                    <LinkIcon className="w-3 h-3" /> Website
                                </a>
                            )}
                        </div>

                        <div className="mt-3 bg-gray-50 dark:bg-dark-bg px-4 py-2 rounded-2xl inline-block max-w-xs">
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{user.bio || 'No bio yet ☁️'}</p>
                        </div>
                    </div>

                    {isOwnProfile && (
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <button onClick={onLogout} title="Logout" className="p-2 bg-white/80 dark:bg-black/50 backdrop-blur rounded-full hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm">
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className="col-span-2 bg-white dark:bg-dark-card rounded-bento p-2 shadow-sm transition-colors border border-transparent dark:border-dark-border">
                    <div className="space-y-2">
                        {/* Stats Row - Clickable */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div
                                onClick={() => openFollowList('followers')}
                                className="bg-gray-50 dark:bg-dark-bg p-3 rounded-xl text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <span className="block text-xl font-bold text-gray-900 dark:text-white">{user?.followers?.length || 0}</span>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Followers</span>
                            </div>
                            <div
                                onClick={() => openFollowList('following')}
                                className="bg-gray-50 dark:bg-dark-bg p-3 rounded-xl text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <span className="block text-xl font-bold text-gray-900 dark:text-white">{user?.following?.length || 0}</span>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Following</span>
                            </div>
                        </div>

                        {/* Buttons based on profile ownership */}
                        {isOwnProfile ? (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Edit Profile
                                </button>
                                <button
                                    className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share Profile
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => navigate(`/chat/${user.id}`)}
                                    className="bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Message
                                </button>
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 
                                        ${isFollowing
                                            ? 'bg-gray-100 text-gray-900 hover:bg-red-50 hover:text-red-500 hover:border-red-200 border border-transparent'
                                            : 'bg-black text-white hover:bg-gray-800'}`}
                                >
                                    {followLoading ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                    ) : isFollowing ? (
                                        <>
                                            <UserCheck className="w-4 h-4" />
                                            Following
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Follow
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Posts Header */}
                <div className="col-span-2 mt-2 flex items-center justify-between px-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">Recent Snaps</h3>
                    <span className="text-xs font-bold text-gray-400 bg-white dark:bg-dark-card px-2 py-1 rounded-lg border border-transparent dark:border-dark-border">
                        {userPosts.length}
                    </span>
                </div>

                {/* Posts Grid */}
                <div className="col-span-2 grid grid-cols-2 gap-2">
                    {userPosts.map(post => (
                        <div key={post.id} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-[24px] overflow-hidden relative group">
                            {post.mediaType === 'video' ? (
                                <video src={post.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                                <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="text-white font-bold flex items-center gap-1">
                                    <span className="text-lg">{post.likes}</span>
                                    <span className="text-2xl">❤️</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {userPosts.length === 0 && (
                        <div className="col-span-2 bg-white dark:bg-dark-card rounded-bento py-12 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 transition-colors border border-transparent dark:border-dark-border">
                            <Grid className="w-12 h-12 mb-2" />
                            <p className="font-medium">No posts yet</p>
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
