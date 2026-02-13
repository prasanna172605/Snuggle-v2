
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Post } from '../types';
import { Settings, Grid, Edit3, Share2, MessageCircle, UserPlus, UserMinus, UserCheck, Camera, Save, X as XIcon, MapPin, Calendar, Link as LinkIcon, Phone, Bookmark, Play, Film, UserSquare2, Heart, Twitter, Instagram } from 'lucide-react';
import { DBService } from '../services/database';
import { SkeletonProfile } from '../components/common/Skeleton';
import PostDetailModal from '../components/PostDetailModal';

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
    const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'favourites' | 'tagged'>('posts');
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

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

    useEffect(() => {
        if (activeTab === 'favourites' && isOwnProfile && currentUser) {
            DBService.getSavedPosts(currentUser.id).then(setSavedPosts);
        }
    }, [activeTab, isOwnProfile, currentUser]);

    const handleFollowToggle = async () => {
        if (!currentUser || !user) return;

        // Optimistic Update
        const previousIsFollowing = isFollowing;
        const previousFollowers = user.followers || [];

        setIsFollowing(!previousIsFollowing);

        // Update local user state for followers count
        setUser(prev => {
            if (!prev) return null;
            const newFollowers = !previousIsFollowing
                ? [...(prev.followers || []), currentUser.id]
                : (prev.followers || []).filter(id => id !== currentUser.id);
            return { ...prev, followers: newFollowers };
        });

        try {
            if (previousIsFollowing) {
                await DBService.unfollowUser(currentUser.id, user.id);
            } else {
                await DBService.followUser(currentUser.id, user.id);
            }
        } catch (error: any) {
            console.error('Follow error:', error);
            // Revert state on error
            setIsFollowing(previousIsFollowing);
            setUser(prev => prev ? { ...prev, followers: previousFollowers } : null);
            alert(error.message || 'Action failed');
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
            }

            // 2. Update Profile Data and Local State
            const updates = {
                ...editForm,
                avatar: avatarUrl || user.avatar
            };
            
            const updatedUser = await DBService.updateProfile(user.id, updates);

            setUser(updatedUser);
            if (isOwnProfile && onLogout) {
                 // Consider updating context user here if we had access to setContextUser
            }
            setIsEditing(false);
            setAvatarFile(null);
            setPreviewAvatar(null);

        } catch (error: any) {
            console.error('Save Profile Error:', error);
            setEditError(error.message);
        } finally {
            setSaving(false);
        }
    };
    
    const openFollowList = async (type: 'followers' | 'following') => {
        if (!user) return;
        setShowFollowList(type);
        const ids = type === 'followers' ? user.followers : user.following;
        if (ids && ids.length > 0) {
            const users = await DBService.getUsersByIds(ids);
            setFollowListUsers(users);
        } else {
            setFollowListUsers([]);
        }
    }

    if (loading) return <SkeletonProfile />;
    if (!user) return <div className="p-10 text-center">User not found</div>;

    // --- Edit Mode UI ---
    if (isEditing) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black p-4 pb-24">
                <div className="max-w-md mx-auto bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setIsEditing(false)} className="text-gray-500">Cancel</button>
                        <h2 className="text-xl font-bold dark:text-white">Edit Profile</h2>
                        <button onClick={handleSaveProfile} disabled={saving} className="text-accent font-bold">
                            {saving ? 'Saving...' : 'Done'}
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                             <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 dark:border-dark-border">
                                <img 
                                    src={previewAvatar || user.avatar || 'https://via.placeholder.com/150'} 
                                    className="w-full h-full object-cover" 
                                />
                             </div>
                             <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                             </div>
                        </div>
                        <p className="text-accent font-medium mt-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            Change Profile Photo
                        </p>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                            <input
                                type="text"
                                value={editForm.fullName || ''}
                                onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                className="w-full p-3 bg-gray-50 dark:bg-dark-bg rounded-xl border-none focus:ring-2 focus:ring-accent/20 dark:text-white"
                                placeholder="Name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                            <input
                                type="text"
                                value={editForm.username || ''}
                                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                className="w-full p-3 bg-gray-50 dark:bg-dark-bg rounded-xl border-none focus:ring-2 focus:ring-accent/20 dark:text-white"
                                placeholder="Username"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bio</label>
                            <textarea
                                value={editForm.bio || ''}
                                onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                className="w-full p-3 bg-gray-50 dark:bg-dark-bg rounded-xl border-none focus:ring-2 focus:ring-accent/20 dark:text-white resize-none h-24"
                                placeholder="Bio"
                            />
                        </div>
                        {editError && <p className="text-red-500 text-sm text-center">{editError}</p>}
                    </div>
                </div>
            </div>
        );
    }

    // --- View Mode UI (New Design) ---
    return (
        <div className="pb-28 bg-warm-neutral dark:bg-black min-h-screen">
             {/* Header with Settings - Overlay on Cover Image */}
             <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center text-white">
                 <button onClick={() => navigate(-1)} className="p-2 bg-black/20 backdrop-blur-md rounded-full hover:bg-black/30 transition-colors">
                     <XIcon className="w-6 h-6" />
                 </button>
                 {isOwnProfile && (
                     <button onClick={() => navigate('/settings')} className="p-2 bg-black/20 backdrop-blur-md rounded-full hover:bg-black/30 transition-colors">
                         <Settings className="w-6 h-6" />
                     </button>
                 )}
             </div>

            {/* Profile Header Block */}
            <div className="bg-white dark:bg-dark-card rounded-b-[40px] shadow-sm overflow-hidden mb-6">
                {/* Cover Image */}
                <div className="h-48 md:h-64 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 relative">
                     {/* Future: Real Cover Image */}
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-8 pt-0 relative text-center">
                    {/* Avatar */}
                    <div className="relative -mt-16 mb-4 inline-block">
                        <div className="w-32 h-32 rounded-full p-1 bg-white dark:bg-dark-card mx-auto">
                            <img 
                                src={user.avatar} 
                                alt={user.username} 
                                className="w-full h-full rounded-full object-cover border-4 border-white dark:border-dark-card" 
                            />
                        </div>
                    </div>

                    {/* Name & Handle */}
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{user.fullName}</h1>
                    <p className="text-gray-500 font-medium mb-4">@{user.username}</p>

                    {/* Bio */}
                    {user.bio && (
                        <p className="text-gray-700 dark:text-gray-300 max-w-md mx-auto mb-4 leading-relaxed">
                            {user.bio}
                        </p>
                    )}

                    {/* Social Links */}
                    {user.socialLinks && (user.socialLinks.website || user.socialLinks.instagram || user.socialLinks.twitter) && (
                        <div className="flex justify-center gap-4 mb-6">
                            {user.socialLinks.website && (
                                <a href={user.socialLinks.website.startsWith('http') ? user.socialLinks.website : `https://${user.socialLinks.website}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-accent transition-colors">
                                    <LinkIcon className="w-5 h-5" />
                                </a>
                            )}
                            {user.socialLinks.instagram && (
                                <a href={`https://instagram.com/${user.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-500 transition-colors">
                                    <Instagram className="w-5 h-5" />
                                </a>
                            )}
                            {user.socialLinks.twitter && (
                                <a href={`https://twitter.com/${user.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors">
                                    <Twitter className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-center gap-3 mb-8">
                        {isOwnProfile ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                            >
                                Edit Profile
                            </button>
                        ) : (
                             <button
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                                className={`px-8 py-3 font-bold rounded-2xl transition-all shadow-lg shadow-accent/20 ${isFollowing
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                                    : 'bg-accent text-white'
                                    }`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                        <button className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>

                     {/* Stats Row */}
                     <div className="flex justify-center gap-8 md:gap-16 border-t border-gray-100 dark:border-dark-border pt-6">
                        <div className="text-center">
                            <span className="block font-black text-xl text-gray-900 dark:text-white">{userPosts.length}</span>
                            <span className="text-sm text-gray-500 font-medium uppercase tracking-wide">Posts</span>
                        </div>
                        <div className="text-center cursor-pointer hover:opacity-70" onClick={() => openFollowList('followers')}>
                            <span className="block font-black text-xl text-gray-900 dark:text-white">{user.followers?.length || 0}</span>
                            <span className="text-sm text-gray-500 font-medium uppercase tracking-wide">Followers</span>
                        </div>
                        <div className="text-center cursor-pointer hover:opacity-70" onClick={() => openFollowList('following')}>
                            <span className="block font-black text-xl text-gray-900 dark:text-white">{user.following?.length || 0}</span>
                            <span className="text-sm text-gray-500 font-medium uppercase tracking-wide">Following</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs - Pill Style */}
            <div className="px-4 mb-4">
                <div className="bg-white dark:bg-dark-card p-1.5 rounded-[24px] flex shadow-sm">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-2.5 rounded-[20px] font-bold text-sm transition-all ${activeTab === 'posts'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                    >
                        Posts
                    </button>
                    <button
                        onClick={() => setActiveTab('reels')}
                        className={`flex-1 py-2.5 rounded-[20px] font-bold text-sm transition-all ${activeTab === 'reels'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                    >
                        Reels
                    </button>
                    {isOwnProfile && (
                         <button
                            onClick={() => setActiveTab('favourites')}
                            className={`flex-1 py-2.5 rounded-[20px] font-bold text-sm transition-all ${activeTab === 'favourites'
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                        >
                            Saved
                        </button>
                    )}
                </div>
            </div>

            {/* Posts Grid */}
            <div className="max-w-4xl mx-auto px-4 pb-20">
                <div className="grid grid-cols-3 gap-1.5 container-round">
                    {activeTab === 'posts' && userPosts.map(post => (
                        <div
                            key={post.id}
                            onClick={() => setSelectedPost(post)}
                            className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-2xl"
                        >
                            {post.mediaType === 'video' ? (
                                <>
                                    <video src={post.imageUrl} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2">
                                        <Play className="w-5 h-5 text-white fill-white drop-shadow-md" />
                                    </div>
                                </>
                            ) : (
                                <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
                            )}
                        </div>
                    ))}
                     {activeTab === 'reels' && (
                        <div className="col-span-3 py-12 text-center text-gray-400">
                            <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No reels yet</p>
                        </div>
                    )}
                    {activeTab === 'favourites' && isOwnProfile && (
                        savedPosts.length > 0 ? (
                            savedPosts.map(post => (
                                <div
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-2xl"
                                >
                                    {post.mediaType === 'video' ? (
                                        <>
                                            <video src={post.imageUrl} className="w-full h-full object-cover" />
                                            <div className="absolute top-2 right-2">
                                                <Play className="w-5 h-5 text-white fill-white drop-shadow-md" />
                                            </div>
                                        </>
                                    ) : (
                                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="" />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3 py-12 text-center text-gray-400">
                                <div className="w-12 h-12 mx-auto mb-2 opacity-50 flex items-center justify-center text-4xl">⭐</div>
                                <p>Your favourites will appear here</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Post Detail Modal */}
            {selectedPost && user && (
                <PostDetailModal
                    post={selectedPost}
                    user={user}
                    currentUser={currentUser}
                    isOwner={isOwnProfile}
                    onClose={() => setSelectedPost(null)}
                    onPostUpdated={() => {
                        if (user) {
                            DBService.getUserPosts(user.id).then(setUserPosts);
                        }
                    }}
                    onPostDeleted={() => {
                        setUserPosts(prev => prev.filter(p => p.id !== selectedPost.id));
                        setSelectedPost(null);
                    }}
                />
            )}

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
