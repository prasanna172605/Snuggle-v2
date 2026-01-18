
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    arrayUnion,
    arrayRemove,
    increment,
    serverTimestamp,
    QueryConstraint,
    collectionGroup
} from 'firebase/firestore';
import { db, auth, storage, googleProvider, realtimeDb, messaging } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getToken } from 'firebase/messaging';
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut, deleteUser as deleteFirebaseUser, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { ref as rtdbRef, set, onDisconnect, serverTimestamp as rtdbServerTimestamp, onValue, off } from 'firebase/database';

// Types


// Types
import { User, Post as AppPost, Story as AppStory, Notification as AppNotification, CoreContent, ContentType, ContentStatus, ContentPriority } from '../types';

export interface Call {
    id: string;
    callerId: string;
    recipientId: string;
    startTime: Timestamp;
    endTime?: Timestamp;
    duration?: number;
    status: 'ongoing' | 'ended' | 'missed';
}

// Helper function to convert API timestamps to Firebase Timestamps
function convertTimestamp(value: any): Timestamp | null {
    if (!value) return null;

    // Already a Firebase Timestamp
    if (value instanceof Timestamp) return value;

    // API response format: { _seconds, _nanoseconds }
    if (value._seconds !== undefined && value._nanoseconds !== undefined) {
        return new Timestamp(value._seconds, value._nanoseconds);
    }

    // Plain number (milliseconds)
    if (typeof value === 'number') {
        return Timestamp.fromMillis(value);
    }

    return null;
}

// DB Model for User (matches Firestore data)
export interface DBUser {
    id: string;
    username: string;
    fullName: string;
    avatar: string;
    bio?: string;
    isOnline?: boolean;
    email: string;
    role: 'user' | 'admin';
    isActive: boolean;
    emailVerified: boolean;
    verificationToken?: string;
    verificationExpires?: number;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string; // Stored securely
    twoFactorBackupCodes?: string[];
    lastLogin?: Timestamp;
    displayName: string;
    followers: string[];
    following: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
    phone?: string;
    location?: {
        city?: string;
        country?: string;
    };
    dateOfBirth?: string;
    socialLinks?: {
        instagram?: string;
        twitter?: string;
        website?: string;
    };
}

export interface Post {
    id: string;
    userId: string;
    username: string;
    userAvatar?: string;
    caption: string;
    imageUrl?: string;
    likes: string[];
    commentCount: number;
    createdAt: Timestamp;
}

export interface Comment {
    id: string;
    postId: string;
    userId: string;
    username: string;
    text: string;
    createdAt: Timestamp;
}

// Local Message interface removed to use shared types
// export interface Message { ... }


export interface Story {
    id: string;
    userId: string;
    username: string;
    userAvatar?: string;
    mediaUrl: string; // Used by DB
    imageUrl?: string; // Mapped for Feed compatibility
    mediaType: 'image' | 'video';
    createdAt: Timestamp;
    expiresAt: Timestamp;
    views: string[];
}


export interface Notification {
    id: string;
    userId: string;
    type: 'like' | 'comment' | 'follow' | 'message' | 'circle_invite';
    senderId: string;
    text: string;
    read: boolean;
    createdAt: Timestamp;
    // Optional legacy fields if needed
    fromUsername?: string;
    fromUserAvatar?: string;
    postId?: string;
}

// Database Service Class
export class DBService {

    // ==================== USER OPERATIONS ====================

    static async createUser(userId: string, userData: Partial<DBUser>): Promise<User> {
        const userRef = doc(db, 'users', userId);
        const newUser: DBUser = {
            id: userId,
            username: userData.username || '',
            email: userData.email || '',
            // password: userData.password || '', // Removed from schema
            displayName: userData.displayName || userData.username || '',
            fullName: userData.fullName || userData.displayName || '',
            bio: userData.bio || '',
            avatar: userData.avatar || '',
            role: 'user',
            isActive: true,
            emailVerified: false,
            followers: [],
            following: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            lastLogin: Timestamp.now()
        };

        await setDoc(userRef, newUser);

        return {
            ...newUser,
            uid: newUser.id,
            photoURL: newUser.avatar,
            createdAt: newUser.createdAt.toMillis(),
            updatedAt: newUser.updatedAt.toMillis(),
            lastLogin: newUser.lastLogin?.toMillis()
        } as unknown as User;
    }

    static async getUserById(userId: string): Promise<User | null> {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data() as DBUser;

            const createdAtTs = convertTimestamp(data.createdAt);
            const updatedAtTs = convertTimestamp(data.updatedAt);
            const lastLoginTs = convertTimestamp(data.lastLogin);

            return {
                ...data,
                createdAt: createdAtTs?.toMillis() || Date.now(),
                updatedAt: updatedAtTs?.toMillis() || Date.now(),
                lastLogin: lastLoginTs?.toMillis() || Date.now()
            } as User;
        }
        return null;
    }

    static async getUserByUsername(username: string): Promise<User | null> {
        const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;

        const data = querySnapshot.docs[0].data() as DBUser;

        const createdAtTs = convertTimestamp(data.createdAt);
        const updatedAtTs = convertTimestamp(data.updatedAt);
        const lastLoginTs = convertTimestamp(data.lastLogin);

        return {
            ...data,
            createdAt: createdAtTs?.toMillis() || Date.now(),
            updatedAt: updatedAtTs?.toMillis() || Date.now(),
            lastLogin: lastLoginTs?.toMillis() || Date.now()
        } as User;
    }

    static async getUsersByIds(userIds: string[]): Promise<User[]> {
        if (!userIds || userIds.length === 0) return [];
        // Fetch in parallel. For large lists, this should be paginated or batched,
        // but for this MVP feature it suffices.
        // getUserById now returns User (App type), so this map is correct.
        const promises = userIds.map(id => this.getUserById(id));
        const users = await Promise.all(promises);
        return users.filter(u => u !== null) as User[];
    }

    static async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, updates);
    }

    static async requestNotificationPermission(userId: string): Promise<boolean> {
        try {
            console.log('[FCM] Starting token registration for user:', userId);
            if (!messaging) {
                console.error('[FCM] Messaging not initialized');
                return false;
            }

            const permission = await Notification.requestPermission();
            console.log('[FCM] Notification permission:', permission);
            if (permission !== 'granted') return false;

            console.log('[FCM] Getting FCM token with VAPID key:', import.meta.env.VITE_FIREBASE_VAPID_KEY?.substring(0, 20) + '...');
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });

            if (token) {
                console.log('[FCM] Token received:', token.substring(0, 50) + '...');
                console.log('[FCM] Saving to Firestore for user:', userId);
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    fcmTokens: arrayUnion(token)
                });
                console.log('[FCM] ✅ Token successfully saved to Firestore!');
                console.log('Notification permission granted, token saved:', token);
                return true;
            } else {
                console.error('[FCM] No token received from getToken()');
            }
        } catch (error) {
            console.error('[FCM] ❌ Error during token registration:', error);
            console.error('[FCM] Error details:', error instanceof Error ? error.message : error);
            console.error('[FCM] Full error object:', JSON.stringify(error, null, 2));
        }
        return false;
    }

    static async searchUsers(searchTerm: string, maxResults: number = 20): Promise<User[]> {
        const q = query(
            collection(db, 'users'),
            where('username', '>=', searchTerm),
            where('username', '<=', searchTerm + '\uf8ff'),
            limit(maxResults)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as DBUser;
            return {
                ...data,
                uid: data.id,
                photoURL: data.avatar,
                createdAt: data.createdAt?.toMillis() || Date.now(),
                updatedAt: data.updatedAt?.toMillis() || Date.now(),
                lastLogin: data.lastLogin?.toMillis() || Date.now()
            } as unknown as User;
        });
    }

    // ==================== AUTHENTICATION OPERATIONS ====================

    static async loginUser(identifier: string, password: string): Promise<any> {
        // Note: Firebase Auth handles password verification

        // Check if identifier is email or username
        let email = identifier;
        if (!identifier.includes('@')) {
            // It's a username, look up the email
            const user = await this.getUserByUsername(identifier);
            if (!user) throw new Error('User not found');
            email = user.email || '';
        }

        if (!email) throw new Error('Invalid email');

        // Firebase Auth sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Get user data from Firestore
        const userData = await this.getUserById(userId);
        if (!userData) throw new Error('User data not found');

        // Update lastLogin
        await updateDoc(doc(db, 'users', userId), {
            lastLogin: serverTimestamp()
        });

        // Get fresh user data
        const updatedUserData = await this.getUserById(userId);
        if (!updatedUserData) throw new Error('User data not found');

        await this.saveSession(updatedUserData);
        return updatedUserData;
    }


    static async resetPassword(email: string): Promise<void> {
        await sendPasswordResetEmail(auth, email);
    }

    static async getCurrentToken(): Promise<string | null> {
        if (!auth.currentUser) return null;
        return await auth.currentUser.getIdToken(true); // Force refresh to get latest claims
    }

    static async loginWithGoogle(): Promise<{ user?: User; isNew: boolean; googleData?: any }> {

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const userId = result.user.uid;

            // Check if user exists in Firestore
            let user = await this.getUserById(userId);

            if (!user) {
                // New user - extract Google data
                const displayName = result.user.displayName || '';
                const email = result.user.email || '';
                const avatar = result.user.photoURL || '';
                const username = email.split('@')[0]; // Generate username from email

                return {
                    isNew: true,
                    googleData: {
                        email,
                        fullName: displayName,
                        avatar
                    }
                };
            } else {
                // Existing user
                await this.saveSession(user);
                return {
                    user,
                    isNew: false
                };
            }
        } catch (error: any) {
            throw new Error(error.message || 'Google login failed');
        }
    }

    static async completeGoogleSignup(data: { username: string; fullName: string; email: string; avatar: string }): Promise<any> {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('No authenticated user found');
        const userId = currentUser.uid;

        // Check if username taken
        const existing = await this.getUserByUsername(data.username);
        if (existing) throw new Error('Username already taken');

        // Create user document in Firestore
        // Note: verify createUser signature in file, assuming it accepts Partial<User>
        const newUser = await this.createUser(userId, {
            username: data.username,
            email: data.email,
            fullName: data.fullName,
            displayName: data.fullName,
            avatar: data.avatar,
            bio: '',
            role: 'user',
            isActive: true,
            emailVerified: true, // Google users are verified implicitly
            updatedAt: Timestamp.now(),
            lastLogin: Timestamp.now()
            // No password for Google users
        });

        // Sync to Realtime Database
        try {
            const rtdbUserRef = rtdbRef(realtimeDb, `users/${userId}`);
            await set(rtdbUserRef, {
                username: newUser.username,
                fullName: newUser.fullName,
                avatar: newUser.avatar,
                bio: newUser.bio,
                isOnline: true,
                createdAt: rtdbServerTimestamp()
            });
        } catch (error) {
            console.warn('RTDB user sync failed (likely permissions):', error);
        }

        // Save session
        await this.saveSession(newUser);
        return newUser;
    }

    static async registerUser(userData: { fullName: string; username: string; email: string; password: string }): Promise<any> {
        try {
            // Check if username already exists
            const existingUser = await this.getUserByUsername(userData.username);
            if (existingUser) {
                throw new Error('Username already taken');
            }

            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const userId = userCredential.user.uid;

            // Create user document in Firestore
            const newUser = await this.createUser(userId, {
                username: userData.username,
                email: userData.email,
                fullName: userData.fullName,
                displayName: userData.fullName,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=random`,
                bio: '',
                role: 'user',
                isActive: true,
                emailVerified: false,
                updatedAt: Timestamp.now(),
                lastLogin: Timestamp.now()
                // password: userData.password // Removed
            });

            // Sync to Realtime Database
            try {
                const rtdbUserRef = rtdbRef(realtimeDb, `users/${userId}`);
                await set(rtdbUserRef, {
                    username: newUser.username,
                    fullName: newUser.fullName,
                    avatar: newUser.avatar,
                    bio: newUser.bio,
                    isOnline: true,
                    createdAt: rtdbServerTimestamp()
                });
            } catch (error) {
                console.warn('RTDB user sync failed (likely permissions):', error);
            }

            // Save session
            await this.saveSession(newUser);

            return newUser;
        } catch (error: any) {
            throw new Error(error.message || 'Registration failed');
        }
    }

    static async saveSession(user: User): Promise<void> {
        // Save to localStorage for quick login
        const savedSessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');

        // Check if session already exists
        const existingIndex = savedSessions.findIndex((s: any) => s.id === user.id);
        if (existingIndex !== -1) {
            savedSessions[existingIndex] = user;
        } else {
            savedSessions.push(user);
        }

        localStorage.setItem('savedSessions', JSON.stringify(savedSessions));
    }

    static async getSavedSessions(): Promise<User[]> {
        const savedSessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');
        return savedSessions;
    }

    static async removeSession(userId: string): Promise<void> {
        const savedSessions = JSON.parse(localStorage.getItem('savedSessions') || '[]');
        const filtered = savedSessions.filter((s: any) => s.id !== userId);
        localStorage.setItem('savedSessions', JSON.stringify(filtered));
    }

    static observeAuthState(callback: (user: User | null) => void): () => void {

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const user = await this.getUserById(firebaseUser.uid);
                callback(user);
                if (user) {
                    await this.updatePresence(user.id, true);
                }
            } else {
                callback(null);
            }
        });

        return unsubscribe;
    }

    static async loginInternal(user: User): Promise<void> {
        // This is for switching between saved sessions without re-authenticating
        await this.saveSession(user);
        await this.updatePresence(user.id, true);
    }

    static async logoutUser(userId: string): Promise<void> {

        await this.updatePresence(userId, false);
        await signOut(auth);
    }

    static async deleteUser(userId: string): Promise<void> {

        // Delete user from Firestore
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);

        // Remove session
        await this.removeSession(userId);

        // Delete Firebase Auth user
        if (auth.currentUser) {
            await deleteFirebaseUser(auth.currentUser);
        }
    }

    static async updatePresence(userId: string, isOnline: boolean): Promise<void> {
        // Update Firestore
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { isOnline });

        // When user comes online, mark all pending "sent" messages to them as "delivered"
        if (isOnline) {
            try {
                const pendingMsgsQuery = query(
                    collectionGroup(db, 'messages'),
                    where('receiverId', '==', userId),
                    where('status', '==', 'sent')
                );
                const snapshot = await getDocs(pendingMsgsQuery);
                const updatePromises = snapshot.docs.map(doc =>
                    updateDoc(doc.ref, { status: 'delivered' })
                );
                await Promise.all(updatePromises);
            } catch (error) {
                console.warn('Failed to update pending messages to delivered:', error);
            }
        }

        // Also update Realtime Database for real-time presence
        try {
            const presenceRef = rtdbRef(realtimeDb, `presence/${userId}`);
            if (isOnline) {
                await set(presenceRef, {
                    online: true,
                    lastSeen: rtdbServerTimestamp()
                });
                // Set up disconnect handler
                onDisconnect(presenceRef).set({
                    online: false,
                    lastSeen: rtdbServerTimestamp()
                });
            } else {
                await set(presenceRef, {
                    online: false,
                    lastSeen: rtdbServerTimestamp()
                });
            }
        } catch (error) {
            console.warn('RTDB presence update failed (likely permissions):', error);
        }
    }


    static async uploadAvatar(userId: string, file: File): Promise<string> {
        const fileRef = ref(storage, `avatars/${userId}_${Date.now()}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    }

    static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
        // ... existing updateProfile code logic is slightly different than above view but I don't see it all.
        // I will trust the existing method signature if I can see it, but I need to make sure I don't break it. 
        // Logic from previous view_file lines 555 showed:
        // updateProfile(userId: string, updates: { fullName?: string; username?: string; bio?: string; avatar?: string }): Promise<User>
        // My new types have more fields. I should update the type definition of 'updates' to Partial<User> to be more flexible.

        const userRef = doc(db, 'users', userId);

        // Update Firestore
        await updateDoc(userRef, {
            ...updates,
            displayName: updates.fullName || undefined
        });

        // Sync to Realtime Database for real-time access
        try {
            const rtdbUserRef = rtdbRef(realtimeDb, `users/${userId}`);
            // We only need to sync key fields to RTDB for performance/size usually, but for now syncing all is fine.
            // Filter undefineds
            const rtdbUpdates: any = { ...updates, updatedAt: rtdbServerTimestamp() };
            Object.keys(rtdbUpdates).forEach(key => rtdbUpdates[key] === undefined && delete rtdbUpdates[key]);

            await set(rtdbUserRef, rtdbUpdates);
        } catch (error) {
            console.warn('RTDB profile sync failed (likely permissions):', error);
        }

        // Get and return updated user
        const updatedUserSnap = await getDoc(userRef);
        if (!updatedUserSnap.exists()) throw new Error('User not found');

        const data = updatedUserSnap.data() as DBUser;
        const updatedUser: User = {
            ...data,
            createdAt: data.createdAt?.toMillis() || Date.now(),
            updatedAt: data.updatedAt?.toMillis() || Date.now(),
            lastLogin: data.lastLogin?.toMillis() || Date.now()
        };

        // Update session storage
        await this.saveSession(updatedUser);

        return updatedUser;
    }

    static subscribeToNotifications(userId: string, callback: (notifications: import('../types').Notification[]) => void): () => void {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => {
                const data = doc.data() as any;
                // Map Firestore data to application Notification type
                const notif: import('../types').Notification = {
                    id: doc.id,
                    userId: data.userId,
                    senderId: data.senderId || data.fromUserId,
                    type: data.type,
                    body: data.text || data.message || data.body,
                    createdAt: data.createdAt?.toMillis() || Date.now(),
                    read: data.read
                };
                return notif;
            });
            callback(notifications);
        });

        return unsubscribe;
    }


    // ==================== FOLLOW SYSTEM ====================

    static async followUser(followerId: string, followingId: string): Promise<void> {
        const followerRef = doc(db, 'users', followerId);
        const followingRef = doc(db, 'users', followingId);

        await updateDoc(followerRef, {
            following: arrayUnion(followingId)
        });

        await updateDoc(followingRef, {
            followers: arrayUnion(followerId)
        });

        // Create notification
        const follower = await this.getUserById(followerId);
        if (follower) {
            await this.createNotification({
                userId: followingId,
                type: 'follow',
                senderId: followerId,
                text: `${follower.username} started following you`
            });
        }
    }

    static async unfollowUser(followerId: string, followingId: string): Promise<void> {
        const followerRef = doc(db, 'users', followerId);
        const followingRef = doc(db, 'users', followingId);

        await updateDoc(followerRef, {
            following: arrayRemove(followingId)
        });

        await updateDoc(followingRef, {
            followers: arrayRemove(followerId)
        });
    }

    static async getFollowers(userId: string): Promise<User[]> {
        const user = await this.getUserById(userId);
        if (!user || !user.followers || !user.followers.length) return [];
        const followers: User[] = [];
        for (const followerId of user.followers) {
            const follower = await this.getUserById(followerId);
            if (follower) followers.push(follower);
        }
        return followers;
    }

    static async getFollowing(userId: string): Promise<User[]> {
        const user = await this.getUserById(userId);
        if (!user || !user.following || !user.following.length) return [];
        const following: User[] = [];
        for (const followingId of user.following) {
            const followingUser = await this.getUserById(followingId);
            if (followingUser) following.push(followingUser);
        }
        return following;
    }

    static async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        const follower = await this.getUserById(followerId);
        if (!follower || !follower.following) return false;
        return follower.following.includes(followingId);
    }

    // ==================== POST OPERATIONS ====================

    static async createPost(postData: Omit<Post, 'id' | 'likes' | 'commentCount' | 'createdAt'>): Promise<Post> {
        const postRef = doc(collection(db, 'posts'));
        const newPost: Post = {
            id: postRef.id,
            ...postData,
            likes: [],
            commentCount: 0,
            createdAt: Timestamp.now()
        };

        await setDoc(postRef, newPost);
        return newPost;
    }

    static async getPost(postId: string): Promise<Post | null> {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        return postSnap.exists() ? postSnap.data() as Post : null;
    }

    static async getFeed(userId: string, maxPosts: number = 20): Promise<import('../types').Post[]> {
        const user = await this.getUserById(userId);
        if (!user) return [];
        const userFollowing = user.following || []; // Safe access
        const following = [...userFollowing, userId];
        const q = query(
            collection(db, 'posts'),
            where('userId', 'in', following.slice(0, 10)),
            orderBy('createdAt', 'desc'),
            limit(maxPosts)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as Post;
            return {
                id: doc.id,
                userId: data.userId,
                username: data.username || 'Unknown',
                imageUrl: data.imageUrl || '',
                caption: data.caption,
                likes: data.likes.length,
                commentCount: data.commentCount,
                comments: data.commentCount, // map for compatibility
                createdAt: data.createdAt.toMillis(),
                timestamp: data.createdAt.toMillis()
            } as import('../types').Post;
        });
    }

    static async getUserPosts(userId: string, maxPosts: number = 20): Promise<import('../types').Post[]> {
        const q = query(
            collection(db, 'posts'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(maxPosts)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as Post;
            return {
                id: doc.id,
                userId: data.userId,
                imageUrl: data.imageUrl || '',
                caption: data.caption,
                likes: data.likes.length,
                comments: data.commentCount,
                timestamp: data.createdAt.toMillis()
            } as import('../types').Post;
        });
    }

    // ==================== CORE CONTENT OPERATIONS ====================

    static async createContent(data: Partial<CoreContent>): Promise<CoreContent> {
        const token = await this.getCurrentToken();
        const response = await fetch('/api/v1/content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create content');
        }

        const result = await response.json();
        return result.data.content;
    }

    static async getContentList(
        page: number = 1,
        limit: number = 20,
        filters?: { status?: string, priority?: string, search?: string }
    ): Promise<{ data: CoreContent[], pagination: any, filters?: any }> {
        const token = await this.getCurrentToken();

        // Build query string
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });

        if (filters?.status) params.append('status', filters.status);
        if (filters?.priority) params.append('priority', filters.priority);
        if (filters?.search) params.append('q', filters.search);

        const response = await fetch(`/api/v1/content?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch content');
        }

        const result = await response.json();
        return {
            data: result.data,
            pagination: result.pagination,
            filters: result.filters
        };
    }

    static async getContentById(id: string): Promise<CoreContent> {
        const token = await this.getCurrentToken();
        const response = await fetch(`/api/v1/content/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch content details');
        }

        const result = await response.json();
        return result.data;
    }

    static async updateContent(id: string, updates: Partial<CoreContent>): Promise<CoreContent> {
        const token = await this.getCurrentToken();
        const response = await fetch(`/api/v1/content/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to update content');
        }

        const result = await response.json();
        return result.data;
    }

    static async likePost(postId: string, userId: string): Promise<void> {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            likes: arrayUnion(userId)
        });

        // Create notification
        const post = await this.getPost(postId);
        const liker = await this.getUserById(userId);
        if (post && liker && post.userId !== userId) {
            await this.createNotification({
                userId: post.userId,
                type: 'like',
                senderId: userId,
                text: `${liker.username} liked your post`,
                // @ts-ignore - Extra fields for consistency if needed, but senderId/text are core
                postId: postId
            });
        }
    }

    static async unlikePost(postId: string, userId: string): Promise<void> {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            likes: arrayRemove(userId)
        });
    }

    static async deletePost(postId: string): Promise<void> {
        // Delete post document
        const postRef = doc(db, 'posts', postId);
        await deleteDoc(postRef);

        // Delete associated comments
        const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId));
        const commentsSnapshot = await getDocs(commentsQuery);
        const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    }

    // ==================== COMMENT OPERATIONS ====================

    static async addComment(commentData: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
        const commentRef = doc(collection(db, 'comments'));
        const newComment: Comment = {
            id: commentRef.id,
            ...commentData,
            createdAt: Timestamp.now()
        };

        await setDoc(commentRef, newComment);

        // Increment post comment count
        const postRef = doc(db, 'posts', commentData.postId);
        await updateDoc(postRef, {
            commentCount: increment(1)
        });

        // Create notification
        const post = await this.getPost(commentData.postId);
        if (post && post.userId !== commentData.userId) {
            await this.createNotification({
                userId: post.userId,
                type: 'comment',
                senderId: commentData.userId,
                text: `${commentData.username} commented on your post`,
                // @ts-ignore
                postId: commentData.postId
            });
        }

        return newComment;
    }

    static async getPostComments(postId: string): Promise<Comment[]> {
        const q = query(
            collection(db, 'comments'),
            where('postId', '==', postId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Comment);
    }

    static async getPosts(): Promise<import('../types').Post[]> {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as Post;
            return {
                id: doc.id,
                userId: data.userId,
                imageUrl: data.imageUrl || '',
                caption: data.caption,
                likes: data.likes.length,
                comments: data.commentCount,
                timestamp: data.createdAt.toMillis()
            } as import('../types').Post;
        });
    }

    // ==================== MESSAGE OPERATIONS ====================

    static getChatId(userId1: string, userId2: string): string {
        return [userId1, userId2].sort().join('_');
    }

    static async sendMessage(messageData: import('../types').Message): Promise<import('../types').Message> {
        if (!messageData.senderId || !messageData.receiverId) {
            throw new Error('Sender and receiver IDs are required');
        }
        const chatId = this.getChatId(messageData.senderId!, messageData.receiverId!);
        const messageRef = doc(collection(db, 'chats', chatId, 'messages'), messageData.id);

        const firestoreMessage = {
            ...messageData,
            timestamp: Timestamp.fromMillis(messageData.timestamp)
        };

        await setDoc(messageRef, firestoreMessage);

        // Check if receiver is online - only mark as "delivered" if they are
        const receiver = messageData.receiverId ? await this.getUserById(messageData.receiverId) : null;
        let finalStatus: 'sent' | 'delivered' = 'sent';

        if (receiver?.isOnline) {
            await updateDoc(messageRef, { status: 'delivered' });
            finalStatus = 'delivered';
        }
        // If receiver is offline, keep status as 'sent' (single tick)

        const chatRef = doc(db, 'chats', chatId);
        console.log('[sendMessage] Updating chat doc with unreadCounts for receiver:', messageData.receiverId);

        // First ensure the chat doc exists with basic info
        await setDoc(chatRef, {
            participants: [messageData.senderId, messageData.receiverId],
            lastMessage: messageData.type === 'text' ? messageData.text : `Sent a ${messageData.type}`,
            lastMessageTime: firestoreMessage.timestamp,
            lastSenderId: messageData.senderId
        }, { merge: true });

        // Then update the nested unreadCounts field
        await updateDoc(chatRef, {
            [`unreadCounts.${messageData.receiverId}`]: increment(1)
        });

        // Trigger Push Notification
        const senderProfile = await this.getUserById(messageData.senderId);
        const senderName = senderProfile?.fullName || "New Message";
        const msgBody = messageData.type === 'text' ? messageData.text : `Sent a ${messageData.type}`;

        await this.sendPushNotification({
            receiverId: messageData.receiverId!,
            title: senderName,
            body: msgBody,
            url: '/messages',
            icon: senderProfile?.avatar
        });

        return { ...messageData, status: finalStatus };
    }

    static async getMessages(userId1: string, userId2: string, maxMessages: number = 50): Promise<import('../types').Message[]> {
        const chatId = this.getChatId(userId1, userId2);
        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(maxMessages)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Handle both number and Timestamp types - ensure we always get a number
            let timestamp: number;
            if (typeof data.timestamp === 'number') {
                timestamp = data.timestamp;
            } else if (data.timestamp && typeof data.timestamp.toMillis === 'function') {
                timestamp = data.timestamp.toMillis();
            } else if (data.timestamp && typeof data.timestamp.seconds === 'number') {
                // Handle Firestore Timestamp object structure
                timestamp = data.timestamp.seconds * 1000;
            } else {
                timestamp = Date.now(); // Fallback
            }

            return {
                ...data,
                timestamp
            } as import('../types').Message;
        }).reverse();
    }

    // Real-time subscription for messages - enables instant status updates
    static subscribeToMessages(
        userId1: string,
        userId2: string,
        callback: (messages: import('../types').Message[]) => void
    ): () => void {
        const chatId = this.getChatId(userId1, userId2);

        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const messages = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Handle both number and Timestamp types - ensure we always get a number
                    let timestamp: number;
                    if (typeof data.timestamp === 'number') {
                        timestamp = data.timestamp;
                    } else if (data.timestamp && typeof data.timestamp.toMillis === 'function') {
                        timestamp = data.timestamp.toMillis();
                    } else if (data.timestamp && typeof data.timestamp.seconds === 'number') {
                        // Handle Firestore Timestamp object structure
                        timestamp = data.timestamp.seconds * 1000;
                    } else {
                        timestamp = Date.now(); // Fallback
                    }

                    return {
                        ...data,
                        timestamp
                    } as import('../types').Message;
                }).reverse();
                callback(messages);
            },
            (error) => {
                console.error('[subscribeToMessages] Error:', error.message, error.code);
            }
        );

        return unsubscribe;
    }

    static async getLastMessage(userId1: string, userId2: string): Promise<import('../types').Message | null> {
        try {
            const chatId = this.getChatId(userId1, userId2);
            const q = query(
                collection(db, `chats/${chatId}/messages`),
                orderBy('timestamp', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return null;

            const data = querySnapshot.docs[0].data();
            return {
                ...data,
                timestamp: (data.timestamp as Timestamp).toMillis()
            } as import('../types').Message;
        } catch (error) {
            console.error('Error getting last message:', error);
            return null;
        }
    }

    static async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
        console.log('[markMessagesAsRead] Called with chatId:', chatId, 'userId:', userId);
        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            where('receiverId', '==', userId),
            where('status', '!=', 'seen')
        );

        const querySnapshot = await getDocs(q);
        console.log('[markMessagesAsRead] Found', querySnapshot.docs.length, 'unread messages');

        const updatePromises = querySnapshot.docs.map(doc => {
            console.log('[markMessagesAsRead] Updating message:', doc.id, 'to seen');
            return updateDoc(doc.ref, { status: 'seen' });
        });

        // Reset unread count for this user
        const chatRef = doc(db, 'chats', chatId);
        updatePromises.push(updateDoc(chatRef, {
            [`unreadCounts.${userId}`]: 0
        }));

        await Promise.all(updatePromises);
        console.log('[markMessagesAsRead] Done, updated', querySnapshot.docs.length, 'messages and reset unread count');
    }

    // Alias for compatibility
    static async markAsSeen(senderId: string, currentUserId: string): Promise<void> {
        const chatId = this.getChatId(senderId, currentUserId);
        await this.markMessagesAsRead(chatId, currentUserId);
    }

    static async deleteChat(chatId: string): Promise<void> {
        // 1. Delete all messages in the subcollection
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const snapshot = await getDocs(messagesRef);

        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2. Delete the chat document itself
        const chatRef = doc(db, 'chats', chatId);
        await deleteDoc(chatRef);
    }

    static async sendTyping(senderId: string, receiverId: string, isTyping: boolean): Promise<void> {
        try {
            const typingRef = rtdbRef(realtimeDb, `typing/${senderId}_${receiverId}`);
            await set(typingRef, {
                isTyping,
                timestamp: rtdbServerTimestamp()
            });
        } catch (e) {
            console.warn('RTDB typing failed, using local storage fallback');
            const event = new CustomEvent('local-storage-typing', {
                detail: { senderId, receiverId, isTyping, timestamp: Date.now() }
            });
            window.dispatchEvent(event);
            localStorage.setItem('snuggle_typing_v1', JSON.stringify({ senderId, receiverId, isTyping, timestamp: Date.now() }));
        }
    }

    // Subscribe to typing status from another user
    static subscribeToTyping(
        otherUserId: string,
        currentUserId: string,
        callback: (isTyping: boolean) => void
    ): () => void {
        const typingRef = rtdbRef(realtimeDb, `typing/${otherUserId}_${currentUserId}`);

        const listener = onValue(typingRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.isTyping) {
                // Check if typing event is recent (within 5 seconds)
                const timestamp = data.timestamp;
                if (timestamp && Date.now() - timestamp < 5000) {
                    callback(true);
                } else {
                    callback(false);
                }
            } else {
                callback(false);
            }
        }, (error) => {
            console.warn('RTDB typing subscription error:', error);
            callback(false);
        });

        return () => off(typingRef, 'value', listener);
    }

    static async reactToMessage(chatId: string, messageId: string, userId: string, emoji: string): Promise<void> {
        const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
        await updateDoc(messageRef, {
            [`reactions.${userId}`]: emoji
        });
    }

    static async deleteMessage(chatId: string, messageId: string): Promise<void> {
        const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
        await deleteDoc(messageRef);

        // Optional: Update lastMessage if the deleted message was the last one
        // This is complex as we need to find the new last message. 
        // For now, we'll leave it as is, or we can fetch the new last message.
        // A robust implementation would be to re-fetch the last message.

        /* 
        const lastMsg = await this.getLastMessage(chatId_part1, chatId_part2); 
        // We'd need to parse chatId back to userIds or just query the subcollection
        */
    }

    static async getUserChats(userId: string): Promise<import('../types').Chat[]> {
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', userId)
            // orderBy('lastMessageTime', 'desc') // Checking removed to avoid index requirement
        );

        const querySnapshot = await getDocs(q);
        const chats = await Promise.all(querySnapshot.docs.map(async doc => {
            const data = doc.data();
            const otherUserId = data.participants.find((p: string) => p !== userId);
            const otherUser = otherUserId ? await this.getUserById(otherUserId) : null;

            // Handle timestamp conversion safely
            let safeTimestamp = 0;
            if (data.lastMessageTime) {
                safeTimestamp = data.lastMessageTime.toMillis ? data.lastMessageTime.toMillis() : 0;
            }

            return {
                id: doc.id,
                ...data,
                otherUser,
                lastMessageTimeValue: safeTimestamp // For sorting
            } as unknown as import('../types').Chat;
        }));

        // Sort in memory
        return chats.sort((a, b) => (b.lastMessageTimeValue || 0) - (a.lastMessageTimeValue || 0));
    }

    // Real-time subscription for user's chats (inbox) - enables live updates
    // Real-time subscription for user's chats (inbox) - enables live updates
    static subscribeToUserChats(
        userId: string,
        callback: (chats: import('../types').Chat[]) => void
    ): () => void {
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', userId)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chats = await Promise.all(snapshot.docs.map(async doc => {
                const data = doc.data();
                const otherUserId = data.participants.find((p: string) => p !== userId);
                const otherUser = otherUserId ? await this.getUserById(otherUserId) : null;

                let safeTimestamp = 0;
                if (data.lastMessageTime) {
                    safeTimestamp = data.lastMessageTime.toMillis ? data.lastMessageTime.toMillis() : 0;
                }

                return {
                    id: doc.id,
                    ...data,
                    otherUser,
                    lastMessageTimeValue: safeTimestamp
                } as unknown as import('../types').Chat;
            }));

            // Sort by most recent
            callback(chats.sort((a, b) => (b.lastMessageTimeValue || 0) - (a.lastMessageTimeValue || 0)));
        });

        return unsubscribe;
    }

    // ==================== STORY OPERATIONS ====================

    static async createStory(storyData: Omit<Story, 'id' | 'createdAt' | 'expiresAt' | 'views'>): Promise<Story> {
        const storyRef = doc(collection(db, 'stories'));
        const now = Timestamp.now();
        const expiresAt = new Timestamp(now.seconds + 86400, now.nanoseconds); // 24 hours

        const newStory: Story = {
            id: storyRef.id,
            ...storyData,
            createdAt: now,
            expiresAt,
            views: []
        };

        await setDoc(storyRef, newStory);
        return newStory;
    }

    static async getUserStories(userId: string): Promise<Story[]> {
        const now = Timestamp.now();
        const q = query(
            collection(db, 'stories'),
            where('userId', '==', userId),
            where('expiresAt', '>', now),
            orderBy('expiresAt', 'asc'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                imageUrl: data.mediaUrl || data.imageUrl // Ensure compatibility
            } as Story;
        });
    }

    // DEPRECATED: Using Circles now
    // static async getFollowingStories(userId: string): Promise<Story[]> {
    //     const user = await this.getUserById(userId);
    //     if (!user || !user.following.length) return [];
    //     const now = Timestamp.now();
    //     const stories: Story[] = [];
    //     for (const followingId of user.following) {
    //         const userStories = await this.getUserStories(followingId);
    //         stories.push(...userStories);
    //     }
    //     return stories.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    // }

    static async viewStory(storyId: string, userId: string): Promise<void> {
        const storyRef = doc(db, 'stories', storyId);
        await updateDoc(storyRef, {
            views: arrayUnion(userId)
        });
    }

    static async deleteExpiredStories(): Promise<void> {
        const now = Timestamp.now();
        const q = query(
            collection(db, 'stories'),
            where('expiresAt', '<', now)
        );

        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    }

    // ==================== NOTIFICATION OPERATIONS ====================

    static async createNotification(notificationData: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<Notification> {
        const notificationRef = doc(collection(db, 'notifications'));
        const newNotification: Notification = {
            id: notificationRef.id,
            ...notificationData,
            read: false,
            createdAt: Timestamp.now()
        };

        await setDoc(notificationRef, newNotification);
        return newNotification;
    }

    static async getUserNotifications(userId: string, maxNotifications: number = 50): Promise<Notification[]> {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(maxNotifications)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Notification);
    }

    static async markNotificationAsRead(notificationId: string): Promise<void> {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
    }

    static async markAllNotificationsAsRead(userId: string): Promise<void> {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const querySnapshot = await getDocs(q);
        const updatePromises = querySnapshot.docs.map(doc =>
            updateDoc(doc.ref, { read: true })
        );
        await Promise.all(updatePromises);
    }

    // ==================== STORAGE OPERATIONS ====================

    static async uploadImage(file: File, path: string): Promise<string> {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    }

    static async deleteImage(imageUrl: string): Promise<void> {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
    }

    // ==================== ADDITIONAL HELPER METHODS ====================

    static subscribeToPosts(callback: (posts: Post[]) => void): () => void {
        const q = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => doc.data() as Post);
            callback(posts);
        }, (error) => {
            console.error('Error subscribing to posts:', error);
            // Return empty array on error to prevent crash
            callback([]);
        });

        return unsubscribe;
    }

    static async getUsers(): Promise<User[]> {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            return querySnapshot.docs.map(doc => doc.data() as User);
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    static async getStories(): Promise<Story[]> {
        try {
            const now = Timestamp.now();
            const q = query(
                collection(db, 'stories'),
                where('expiresAt', '>', now),
                orderBy('expiresAt', 'asc'),
                limit(100)
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    imageUrl: data.mediaUrl || data.imageUrl // Ensure compatibility
                } as Story;
            });
        } catch (error) {
            console.error('Error getting stories:', error);
            // Return empty array if index is still building
            return [];
        }
    }

    // DEPRECATED: Using Circles now
    // static async isMutualFollow(userId1: string, userId2: string): Promise<boolean> {
    //     try {
    //         const user1 = await this.getUserById(userId1);
    //         const user2 = await this.getUserById(userId2);
    //         if (!user1 || !user2) return false;
    //         return user1.following.includes(userId2) && user2.following.includes(userId1);
    //     } catch (error) {
    //         console.error('Error checking mutual follow:', error);
    //         return false;
    //     }
    // }

    // ===== WebRTC Call Methods =====

    /**
     * Create a new call document
     */
    static async createCall(
        callId: string,
        type: 'audio' | 'video',
        initiator: string,
        participants: string[]
    ): Promise<void> {
        try {
            const callRef = doc(db, 'calls', callId);
            await setDoc(callRef, {
                type,
                initiator,
                participants,
                status: 'ringing',
                startTime: Date.now(),
                createdAt: serverTimestamp()
            });
            console.log('[DB] Created call:', callId);
        } catch (error) {
            console.error('[DB] Error creating call:', error);
            throw error;
        }
    }

    /**
     * Update call status
     */
    static async updateCallStatus(
        callId: string,
        status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined'
    ): Promise<void> {
        try {
            const callRef = doc(db, 'calls', callId);
            const updates: any = { status };

            if (status === 'active') {
                updates.startTime = Date.now();
            } else if (status === 'ended') {
                updates.endTime = Date.now();

                // Calculate duration
                const callDoc = await getDoc(callRef);
                if (callDoc.exists()) {
                    const data = callDoc.data();
                    if (data.startTime) {
                        updates.duration = Math.floor((Date.now() - data.startTime) / 1000); // in seconds
                    }
                }
            }

            await updateDoc(callRef, updates);
            console.log('[DB] Updated call status:', callId, status);
        } catch (error) {
            console.error('[DB] Error updating call status:', error);
            throw error;
        }
    }

    /**
     * Add participant to call
     */
    static async addCallParticipant(callId: string, userId: string): Promise<void> {
        try {
            const callRef = doc(db, 'calls', callId);
            await updateDoc(callRef, {
                participants: arrayUnion(userId)
            });
            console.log('[DB] Added participant to call:', userId);
        } catch (error) {
            console.error('[DB] Error adding participant:', error);
            throw error;
        }
    }

    /**
     * Remove participant from call
     */
    static async removeCallParticipant(callId: string, userId: string): Promise<void> {
        try {
            const callRef = doc(db, 'calls', callId);
            await updateDoc(callRef, {
                participants: arrayRemove(userId)
            });
            console.log('[DB] Removed participant from call:', userId);
        } catch (error) {
            console.error('[DB] Error removing participant:', error);
        }
    }

    /**
     * Save call offer (WebRTC signaling)
     */
    static async saveCallOffer(
        callId: string,
        fromUserId: string,
        toUserId: string,
        offer: RTCSessionDescriptionInit
    ): Promise<void> {
        try {
            const signalRef = doc(db, 'calls', callId, 'signals', `${fromUserId}_to_${toUserId}`);
            await setDoc(signalRef, {
                from: fromUserId,
                to: toUserId,
                offer,
                timestamp: serverTimestamp()
            }, { merge: true });
            console.log('[DB] Saved call offer:', fromUserId, '→', toUserId);
        } catch (error) {
            console.error('[DB] Error saving offer:', error);
            throw error;
        }
    }

    /**
     * Save call answer (WebRTC signaling)
     */
    static async saveCallAnswer(
        callId: string,
        fromUserId: string,
        toUserId: string,
        answer: RTCSessionDescriptionInit
    ): Promise<void> {
        try {
            const signalRef = doc(db, 'calls', callId, 'signals', `${toUserId}_to_${fromUserId}`);
            await updateDoc(signalRef, {
                answer,
                answerTimestamp: serverTimestamp()
            });
            console.log('[DB] Saved call answer:', fromUserId, '→', toUserId);
        } catch (error) {
            console.error('[DB] Error saving answer:', error);
            throw error;
        }
    }

    /**
     * Save ICE candidate (WebRTC signaling)
     */
    static async saveIceCandidate(
        callId: string,
        fromUserId: string,
        toUserId: string,
        candidate: RTCIceCandidateInit
    ): Promise<void> {
        try {
            const signalRef = doc(db, 'calls', callId, 'signals', `${fromUserId}_to_${toUserId}`);
            await updateDoc(signalRef, {
                iceCandidates: arrayUnion(candidate)
            });
            console.log('[DB] Saved ICE candidate:', fromUserId, '→', toUserId);
        } catch (error) {
            console.error('[DB] Error saving ICE candidate:', error);
        }
    }

    /**
     * Listen to call signals (WebRTC signaling)
     */
    static listenToCallSignals(
        callId: string,
        currentUserId: string,
        callback: (signals: any[]) => void
    ): () => void {
        const signalsRef = collection(db, 'calls', callId, 'signals');
        const q = query(signalsRef, where('to', '==', currentUserId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const signals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(signals);
        });

        return unsubscribe;
    }

    /**
     * Get call data
     */
    static async getCall(callId: string): Promise<any> {
        try {
            const callRef = doc(db, 'calls', callId);
            const callDoc = await getDoc(callRef);

            if (callDoc.exists()) {
                return { id: callDoc.id, ...callDoc.data() };
            }
            return null;
        } catch (error) {
            console.error('[DB] Error getting call:', error);
            return null;
        }
    }

    /**
     * Save call history as a message in chat
     */
    static async saveCallHistory(
        chatId: string,
        callData: {
            type: 'audio' | 'video';
            duration?: number;
            status: 'completed' | 'missed' | 'declined';
            participants: string[];
            callerId: string; // Who initiated the call
        }
    ): Promise<void> {
        try {
            const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
            await setDoc(messageRef, {
                id: messageRef.id,
                senderId: callData.callerId, // Person who initiated the call
                receiverId: callData.participants.find(p => p !== callData.callerId) || '',
                text: '', // Empty for call messages
                type: 'call',
                callType: callData.type,
                callDuration: callData.duration || 0,
                callStatus: callData.status,
                status: 'seen', // Call messages don't have delivery status
                timestamp: Timestamp.now(), // Use Firestore Timestamp
                createdAt: serverTimestamp()
            });

            // Update chat last message
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: `${callData.type === 'audio' ? '📞' : '📹'
                    } ${callData.status === 'completed'
                        ? `Call (${callData.duration}s)`
                        : callData.status === 'missed'
                            ? 'Missed call'
                            : 'Declined call'
                    } `,
                lastMessageTime: Timestamp.now()
            });

            console.log('[DB] Saved call history to chat');
        } catch (error) {
            console.error('[DB] Error saving call history:', error);
        }
    }

    // ===== WebRTC Signaling (BroadcastChannel + localStorage for cross-tab) =====

    private static signalChannel: BroadcastChannel | null = null;

    private static getSignalChannel(): BroadcastChannel {
        if (!this.signalChannel) {
            this.signalChannel = new BroadcastChannel('snuggle_webrtc_signals');
        }
        return this.signalChannel;
    }

    /**
     * Send WebRTC signaling message via Firestore (works across devices/browsers)
     */
    static async sendSignal(message: any): Promise<void> {
        try {
            console.log('[Signal] Sending to Firestore:', message.type, 'from', message.senderId, 'to', message.receiverId);

            // Save signal to Firestore with auto-generated ID
            const signalRef = doc(collection(db, 'webrtc_signals'));
            await setDoc(signalRef, {
                ...message,
                createdAt: serverTimestamp()
            });

            console.log('[Signal] Sent successfully to Firestore');
        } catch (error) {
            console.error('[Signal] Error sending signal:', error);
        }
    }

    /**
     * Subscribe to WebRTC signals for a specific user via Firestore
     */
    static subscribeToSignals(userId: string, callback: (signal: any) => void): () => void {
        const signalsRef = collection(db, 'webrtc_signals');
        const q = query(
            signalsRef,
            where('receiverId', '==', userId)
        );

        // Track processed signal IDs to prevent re-processing on refresh
        const processedSignals = new Set<string>();

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const signalId = change.doc.id;
                    const signal = change.doc.data();

                    // Skip if we've already processed this signal
                    if (processedSignals.has(signalId)) {
                        console.log('[Signal] Skipping already processed signal:', signalId);
                        return;
                    }

                    // Client-side filter: Ignore signals older than 2 minutes
                    // This allows time for notifications to arrive while preventing ghost calls
                    if (signal.timestamp && signal.timestamp > Date.now() - 120000) {
                        console.log('[Signal] Received from Firestore:', signal.type, signalId);
                        processedSignals.add(signalId);
                        callback(signal);

                        // Delete the signal after processing to keep Firestore clean
                        // This is safe because we've marked it as processed
                        setTimeout(() => {
                            deleteDoc(change.doc.ref).catch(err =>
                                console.warn('[Signal] Failed to delete signal:', err)
                            );
                        }, 5000); // Delete after 5 seconds to allow multi-device processing
                    } else {
                        console.log('[Signal] Ignoring stale signal:', signal.type, signal.timestamp);
                        processedSignals.add(signalId);
                        // Clean up old stale signals immediately
                        deleteDoc(change.doc.ref).catch(err =>
                            console.warn('[Signal] Failed to delete stale signal:', err)
                        );
                    }
                }
            });
        });

        return unsubscribe;
    }




    static async deleteContent(contentId: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const token = await user.getIdToken();
        const response = await fetch(`/api/v1/content/${contentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to delete content');
    }

    static async restoreContent(contentId: string): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const token = await user.getIdToken();
        const response = await fetch(`/api/v1/content/${contentId}/restore`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to restore content');
    }

    static async sendPushNotification(data: {
        receiverId: string;
        title: string;
        body: string;
        url?: string;
        icon?: string;
        type?: 'message' | 'call';
        actions?: any[]; // For call actions like Accept/Decline
        data?: Record<string, any>; // Custom data payload
    }): Promise<void> {
        try {
            // Always use Vercel Production API for Push Notifications (CORS is enabled)
            const apiUrl = 'https://snuggle-seven.vercel.app/api/send-push';

            await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.warn('[DB] Failed to send push notification:', error);
        }
    }
}

// ==================== CIRCLE SERVICE ====================

// CircleService removed
