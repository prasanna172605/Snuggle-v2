
import { User, Post, Story, Message, SignalingMessage, Notification } from '../types';

// LocalStorage Keys
const STORAGE_KEYS = {
  USERS: 'snuggle_users',
  MESSAGES: 'snuggle_messages',
  CURRENT_USER: 'snuggle_current_user',
  SAVED_SESSIONS: 'snuggle_saved_sessions',
  POSTS: 'snuggle_posts',
  STORIES: 'snuggle_stories',
  RELATIONSHIPS: 'snuggle_relationships',
  NOTIFICATIONS: 'snuggle_notifications',
  TYPING_EVENT: 'snuggle_event_typing',
  SIGNALING_EVENT: 'snuggle_event_signaling',
  PRESENCE: 'snuggle_presence'
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const MockService = {
  // --- Auth & User Management ---

  getUsers: async (): Promise<User[]> => {
    await delay(100);
    const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    const presenceMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRESENCE) || '{}');
    return users.map(u => ({ ...u, isOnline: presenceMap[u.id] ?? false }));
  },
  
  getUserById: async (id: string): Promise<User | undefined> => {
    await delay(50); // Small delay for lookups
    const users = await MockService.getUsers();
    return users.find(u => u.id === id);
  },

  registerUser: async (userData: Omit<User, 'id' | 'isOnline' | 'avatar'> & { avatar?: string }): Promise<User> => {
    await delay(500);
    const users = await MockService.getUsers();
    
    if (users.some(u => u.username === userData.username)) throw new Error('Username already taken');
    if (users.some(u => u.email === userData.email)) throw new Error('Email already registered');

    const newUser: User = {
      id: 'user_' + Date.now() + Math.random().toString(36).substr(2, 9),
      isOnline: true,
      ...userData,
      avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
      bio: userData.bio || 'New to Snuggle! 👋'
    };

    // We must read fresh from LS to avoid overwriting updates from other tabs theoretically, 
    // but in this mock we just push to the array we fetched.
    // Ideally we re-read, but for mock this is fine.
    const currentUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    currentUsers.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(currentUsers));
    
    MockService.addSession(newUser.id);
    return newUser;
  },

  loginUser: async (identifier: string, password?: string): Promise<User> => {
    await delay(500);
    const users = await MockService.getUsers();
    const user = users.find(u => 
        (u.email === identifier || u.username === identifier) && 
        (!password || u.password === password)
    );
    
    if (!user) throw new Error('Invalid credentials');
    MockService.addSession(user.id);
    return user;
  },

  // --- Session ---

  addSession: (userId: string) => {
      const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_SESSIONS) || '[]');
      if (!sessions.includes(userId)) {
          sessions.push(userId);
          localStorage.setItem(STORAGE_KEYS.SAVED_SESSIONS, JSON.stringify(sessions));
      }
  },

  getSavedSessions: async (): Promise<User[]> => {
      await delay(100);
      const sessionIds: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_SESSIONS) || '[]');
      const allUsers = await MockService.getUsers();
      return allUsers.filter(u => sessionIds.includes(u.id));
  },

  removeSession: (userId: string) => {
      let sessions: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_SESSIONS) || '[]');
      sessions = sessions.filter(id => id !== userId);
      localStorage.setItem(STORAGE_KEYS.SAVED_SESSIONS, JSON.stringify(sessions));
  },

  updatePresence: (userId: string, isOnline: boolean) => {
    // Fire and forget, or sync. Presence is usually fast.
    const presenceMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRESENCE) || '{}');
    presenceMap[userId] = isOnline;
    localStorage.setItem(STORAGE_KEYS.PRESENCE, JSON.stringify(presenceMap));
    window.dispatchEvent(new Event('local-storage-presence'));
  },

  updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
    await delay(300);
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const index = users.findIndex((u: User) => u.id === userId);
    
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      const currentUserStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.id === userId) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(users[index]));
        }
      }
      return users[index];
    }
    throw new Error("User not found");
  },

  deleteUser: async (userId: string) => {
    await delay(500);
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    users = users.filter((u: User) => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    MockService.removeSession(userId);

    // Clean other data
    let rels = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELATIONSHIPS) || '[]');
    rels = rels.filter((r: any) => r.followerId !== userId && r.followingId !== userId);
    localStorage.setItem(STORAGE_KEYS.RELATIONSHIPS, JSON.stringify(rels));

    let posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    posts = posts.filter((p: any) => p.userId !== userId);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));

    // Events
    window.dispatchEvent(new Event('local-storage-update'));
    window.dispatchEvent(new Event('local-storage-content-update'));
    window.dispatchEvent(new Event('local-storage-relationships'));
  },

  // --- Relationships ---

  getRelationships: async (): Promise<{followerId: string, followingId: string}[]> => {
    await delay(50);
    const str = localStorage.getItem(STORAGE_KEYS.RELATIONSHIPS);
    return str ? JSON.parse(str) : [];
  },

  followUser: async (currentUserId: string, targetUserId: string) => {
    await delay(200);
    if (currentUserId === targetUserId) return;
    const rels = await MockService.getRelationships();
    
    if (!rels.some(r => r.followerId === currentUserId && r.followingId === targetUserId)) {
        rels.push({ followerId: currentUserId, followingId: targetUserId });
        localStorage.setItem(STORAGE_KEYS.RELATIONSHIPS, JSON.stringify(rels));
        
        await MockService.createNotification({
            userId: targetUserId,
            senderId: currentUserId,
            type: 'follow',
            text: 'started following you',
            timestamp: Date.now(),
            read: false,
            id: '',
        });
        window.dispatchEvent(new Event('local-storage-relationships'));
    }
  },

  unfollowUser: async (currentUserId: string, targetUserId: string) => {
    await delay(200);
    let rels = await MockService.getRelationships();
    rels = rels.filter(r => !(r.followerId === currentUserId && r.followingId === targetUserId));
    localStorage.setItem(STORAGE_KEYS.RELATIONSHIPS, JSON.stringify(rels));
    window.dispatchEvent(new Event('local-storage-relationships'));
  },

  getFollowers: async (userId: string): Promise<string[]> => {
    const rels = await MockService.getRelationships();
    return rels.filter(r => r.followingId === userId).map(r => r.followerId);
  },

  getFollowing: async (userId: string): Promise<string[]> => {
    const rels = await MockService.getRelationships();
    return rels.filter(r => r.followerId === userId).map(r => r.followingId);
  },

  isFollowing: async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    const rels = await MockService.getRelationships();
    return rels.some(r => r.followerId === currentUserId && r.followingId === targetUserId);
  },

  isMutualFollow: async (user1Id: string, user2Id: string): Promise<boolean> => {
    const rels = await MockService.getRelationships();
    const aFollowsB = rels.some(r => r.followerId === user1Id && r.followingId === user2Id);
    const bFollowsA = rels.some(r => r.followerId === user2Id && r.followingId === user1Id);
    return aFollowsB && bFollowsA;
  },

  // --- Notifications ---

  getNotifications: async (userId: string): Promise<Notification[]> => {
    await delay(100);
    const str = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const all: Notification[] = str ? JSON.parse(str) : [];
    return all.filter(n => n.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },

  createNotification: async (notif: Notification) => {
    const str = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const all: Notification[] = str ? JSON.parse(str) : [];
    
    const newNotif = {
        ...notif,
        id: 'notif_' + Date.now() + Math.random().toString(36).substr(2, 5)
    };
    
    all.unshift(newNotif);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
    window.dispatchEvent(new Event('local-storage-notifications'));
  },

  markNotificationsRead: async (userId: string) => {
    const str = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!str) return;
    const all: Notification[] = JSON.parse(str);
    const updated = all.map(n => n.userId === userId ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    window.dispatchEvent(new Event('local-storage-notifications'));
  },
  
  getUnreadNotificationCount: async (userId: string): Promise<number> => {
      const notifs = await MockService.getNotifications(userId);
      return notifs.filter(n => !n.read).length;
  },

  // --- Content ---

  getPosts: async (): Promise<Post[]> => {
    await delay(150);
    const stored = localStorage.getItem(STORAGE_KEYS.POSTS);
    return stored ? JSON.parse(stored) : [];
  },

  createPost: async (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments'>) => {
    await delay(800);
    const stored = localStorage.getItem(STORAGE_KEYS.POSTS);
    const posts = stored ? JSON.parse(stored) : [];
    const newPost: Post = {
      ...post,
      id: 'post_' + Date.now(),
      timestamp: Date.now(),
      likes: 0,
      comments: 0
    };
    posts.unshift(newPost);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    window.dispatchEvent(new Event('local-storage-content-update'));
    return newPost;
  },

  createStory: async (story: Omit<Story, 'id' | 'timestamp' | 'viewed'>) => {
    await delay(500);
    const stored = localStorage.getItem(STORAGE_KEYS.STORIES);
    const stories = stored ? JSON.parse(stored) : [];
    const newStory: Story = {
        ...story,
        id: 'story_' + Date.now(),
        timestamp: Date.now(),
        viewed: false
    };
    stories.push(newStory);
    localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(stories));
    window.dispatchEvent(new Event('local-storage-content-update'));
    return newStory;
  },

  getStories: async (): Promise<Story[]> => {
    await delay(100);
    const stored = localStorage.getItem(STORAGE_KEYS.STORIES);
    return stored ? JSON.parse(stored) : [];
  },

  // --- Messaging ---

  getMessages: async (user1: string, user2: string): Promise<Message[]> => {
    await delay(50);
    const allMessages: Message[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    return allMessages.filter(
      m => (m.senderId === user1 && m.receiverId === user2) || (m.senderId === user2 && m.receiverId === user1)
    ).sort((a, b) => a.timestamp - b.timestamp);
  },

  sendMessage: async (message: Message) => {
    // Optimistic UI usually handles this, but here we persist
    const allMessages: Message[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    const msgToSend = { ...message, status: message.status || 'sent' };
    allMessages.push(msgToSend);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));
    window.dispatchEvent(new Event('local-storage-update'));

    // Simulate async delivery
    setTimeout(() => {
        const currentMsgs: Message[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
        const updatedMsgs = currentMsgs.map(m => {
            if (m.id === msgToSend.id && m.status === 'sent') {
                return { ...m, status: 'delivered' as const };
            }
            return m;
        });
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMsgs));
        window.dispatchEvent(new Event('local-storage-update'));
    }, 1000);
  },

  sendTyping: (senderId: string, receiverId: string, isTyping: boolean) => {
    // Fire and forget event
    const eventPayload = {
      type: 'typing',
      senderId,
      receiverId,
      isTyping,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.TYPING_EVENT, JSON.stringify(eventPayload));
    window.dispatchEvent(new Event('local-storage-typing'));
  },

  markAsSeen: async (senderId: string, receiverId: string) => {
    const allMessages: Message[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
    let hasChanges = false;
    
    const updatedMessages = allMessages.map(msg => {
      if (msg.senderId === senderId && msg.receiverId === receiverId && msg.status !== 'seen') {
        hasChanges = true;
        return { ...msg, status: 'seen' as const };
      }
      return msg;
    });

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMessages));
      window.dispatchEvent(new Event('local-storage-update'));
    }
  },

  getLastMessage: async (myUserId: string, otherUserId: string): Promise<Message | null> => {
    const msgs = await MockService.getMessages(myUserId, otherUserId);
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  },

  // --- WebRTC ---
  
  sendSignal: (payload: SignalingMessage) => {
    localStorage.setItem(STORAGE_KEYS.SIGNALING_EVENT, JSON.stringify(payload));
    window.dispatchEvent(new Event('local-storage-signaling'));
  },
};
