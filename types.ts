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
  phone?: string;
  dateOfBirth?: string;
  location?: {
    city?: string;
    country?: string;
  };

  // Status
  isOnline?: boolean;
  lastActive?: number;
  lastLogin?: any;
  createdAt?: any; // Timestamp or number
  updatedAt?: any;

  // Social
  followers?: string[];
  following?: string[];
  likedPosts?: string[];
  savedPosts?: string[];
  deletedPosts?: string[];
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
  notificationSettings?: {
    email: boolean;
    push: boolean;
    frequency: 'realtime' | 'daily' | 'weekly';
    types: {
      followers: boolean;
      messages: boolean;
      likes: boolean;
      mentions: boolean;
    };
  };
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
  // E2EE fields
  encrypted?: boolean;
  iv?: string;              // Base64 initialization vector for AES-GCM
  senderPublicKey?: string; // JWK thumbprint for key verification
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'video' | 'audio' | 'post' | 'call';
  post?: {
    id: string;
    imageUrl?: string;
    caption?: string;
  };
  fileUrl?: string;
  thumbnailUrl?: string;      // Generated thumbnail for video messages
  fileName?: string;          // Original file name
  fileSize?: number;          // File size in bytes
  mediaDuration?: number;     // Duration in seconds for audio/video
  reactions?: Record<string, string>; // userId -> emoji
  callType?: 'audio' | 'video';
  callDuration?: number;
  callStatus?: 'completed' | 'missed' | 'rejected' | 'ongoing';
}

export interface Theme {
  id: string;
  name: string;
  type: 'default' | 'custom';
  backgroundUrl: string;
  createdBy?: string; // userId if custom
  previewUrl?: string; // optimize for list view
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
  
  // Details
  themeId?: string;
  nicknames?: Record<string, string>;
  muted?: boolean; // Hydrated from user settings
}

export interface Post {
  id: string;
  userId: string;
  username?: string;
  userAvatar?: string;
  caption: string;
  imageUrl?: string;
  likes: number | string[];  // Can be count or array of user IDs
  likedBy?: string[];  // Array of user IDs who liked this post
  likeCount?: number;  // Count from subcollection
  comments: number;
  mediaType?: 'image' | 'video';
  commentCount?: number;
  createdAt?: any;
  timestamp?: number;
  updatedAt?: any;
  // Soft delete fields
  deletedAt?: any;
  isDeleted?: boolean;
  tags?: string[];
  favouritesCount?: number;  // Atomic counter for saves/favourites
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
  views?: string[]; // duplicate field used in code
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'like' | 'comment' | 'follow' | 'mention' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;

  // Legacy / derived fields compatibility
  body?: string; // mapped to message
  text?: string; // mapped to message

  // Sender info
  senderId?: string;
  fromUsername?: string;
  fromUserAvatar?: string;
  fromUserId?: string;

  isRead: boolean;
  read?: boolean; // mapped to isRead
  createdAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  parentCommentId?: string;  // For threaded replies
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

// Call Types
export type CallType = 'audio' | 'video';

// WebRTC Signaling Message
export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'end' | 'reject' | 'busy' | 'answered_elsewhere';
  senderId: string;
  receiverId: string;
  timestamp: number;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  callType?: CallType;
  deviceId?: string;
  answeringDeviceId?: string;
  callerId?: string;
}
// Memories System
export type MemoryType = 'image' | 'video' | 'reel';

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  caption: string;
  mediaUrl: string;
  thumbnailUrl?: string; // For videos/reels
  aspectRatio?: number;
  duration?: number;
  
  // Interactions
  likesCount: number;
  commentsCount: number;
  
  // Auth context (hydrated)
  isLiked?: boolean;
  isSaved?: boolean;
  
  // Timestamps
  createdAt: any;
  
  // Hydrated fields
  user?: User;

  // Soft Delete
  isDeleted?: boolean;
  deletedAt?: any;
}
