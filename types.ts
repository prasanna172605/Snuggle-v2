export interface User {
  id: string; // Primary ID (often same as uid)
  uid?: string; // Firebase Auth ID (optional as it overlaps with id)
  email: string;
  username: string;
  displayName: string; // Often same as fullName or username
  photoURL?: string; // Mapped to avatar

  // Extended fields (DBUser compatibility)
  fullName?: string;
  avatar?: string;
  bio?: string;

  // Status
  isOnline?: boolean;
  lastActive?: number;
  lastLogin?: any;
  createdAt?: any; // Timestamp or number
  updatedAt?: any;

  // Social
  followers?: string[];
  following?: string[];
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };

  // Account
  role?: 'user' | 'admin';
  isActive?: boolean;
  emailVerified?: boolean;
  fcmToken?: string;
}

export interface GoogleSetupData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId?: string;
  timestamp: number;
  read: boolean;
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'video' | 'audio';
  fileUrl?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTimeValue?: number;
  lastSenderId?: string;
  unreadCount?: number;
  unreadCounts?: Record<string, number>;
  otherUser?: User;
}

export interface Post {
  id: string;
  userId: string;
  username?: string; // Optional in DB creation
  userAvatar?: string;
  caption: string;
  imageUrl?: string;
  likes: string[] | number; // Can be array of IDs or count
  comments?: Comment[] | number; // Can be comments or count
  commentCount?: number;
  createdAt?: any;
  timestamp?: number; // DB uses timestamp
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  imageUrl: string;
  createdAt: any;
  expiresAt: any;
  viewers?: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system';
  title?: string;
  body?: string;

  // Sender info (various aliases used)
  fromUserId?: string;
  senderId?: string; // Alias

  fromUsername?: string;
  fromUserAvatar?: string;
  resourceId?: string;
  read: boolean;
  createdAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  createdAt: any;
}

// Core Content Types
export type ContentType = 'post' | 'story' | 'reel';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type ContentPriority = 'normal' | 'high' | 'featured';

export interface CoreContent {
  id: string;
  type: ContentType;
  status: ContentStatus;
  priority: ContentPriority;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  title?: string;
  description?: string;
  tags?: string[];
  metrics?: {
    views: number;
    likes: number;
    shares: number;
  };
}

export enum ViewState {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  FEED = 'FEED',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
  MESSAGES = 'MESSAGES',
  CREATE = 'CREATE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  SEARCH = 'SEARCH',
  EDIT_PROFILE = 'EDIT_PROFILE',
  GOOGLE_USERNAME = 'GOOGLE_USERNAME'
}
