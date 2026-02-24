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

// ==================== PULSE SYSTEM ====================

export type PulseTheme = 'spark' | 'glow' | 'flame' | 'fusion' | 'infinity';

// Level formula: level = floor(sqrt(totalEnergy / 50))
// Level thresholds: L1=50, L2=200, L3=450, L4=800, L5=1250
export const PULSE_LEVELS: { name: string; theme: PulseTheme; minEnergy: number; emoji: string }[] = [
  { name: 'New',      theme: 'spark',    minEnergy: 0,    emoji: '🤝' },
  { name: 'Spark',    theme: 'spark',    minEnergy: 50,   emoji: '✨' },
  { name: 'Glow',     theme: 'glow',     minEnergy: 200,  emoji: '💫' },
  { name: 'Flame',    theme: 'flame',    minEnergy: 450,  emoji: '🔥' },
  { name: 'Fusion',   theme: 'fusion',   minEnergy: 800,  emoji: '💜' },
  { name: 'Infinity', theme: 'infinity', minEnergy: 1250, emoji: '♾️' },
];

export const ENERGY_VALUES = {
  text: 1,
  image: 2,
  voice: 3,
  video_call: 4,
  first_interaction_bonus: 5,
  reply_within_2min: 2,
  DAILY_CAP: 50,
  MAX_TEXT_ENERGY_COUNT: 20,    // Only first 20 texts give energy
  SPAM_WINDOW_SEC: 30,          // 5+ msgs in this window = spam
  SPAM_MSG_THRESHOLD: 5,
  STREAK_MULTIPLIER: 2,         // streakDays × 2
  MAX_STREAK_BONUS: 30,
  DECAY_INACTIVE_DAYS: 3,       // Days before decay starts
  DECAY_RATE: 0.05,             // 5% per inactive day
} as const;

export interface Pulse {
  id: string;
  user1Id: string;
  user2Id: string;
  pulseLevel: number;
  pulseEnergy: number;        // Today's earned energy
  totalEnergy: number;        // Lifetime accumulated
  peakLevel: number;          // Highest level reached (never drops)
  streakDays: number;
  lastInteractionDate: string; // YYYY-MM-DD
  lastInteractionTimestamp: number; // Unix ms — for reply-within-2min check
  pulseTheme: PulseTheme;

  // Anti-spam tracking
  dailyTextCount: number;     // Texts counted today for energy
  recentTimestamps: number[]; // Last N message timestamps for spam detection
  lastMessageHash: string;    // Hash of last message to detect repeats

  createdAt: any;
  updatedAt: any;
}

// ==================== MOMENTS SYSTEM ====================

export type MomentType = 'image' | 'video' | 'layout' | 'text';

export interface Moment {
  id: string;
  userId: string;
  type: MomentType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  textOverlay?: string;
  mentions?: string[];
  filter?: string;
  viewCount: number;
  createdAt: any;
  expiresAt: any;        // 24h from creation
}

export interface MomentView {
  momentId: string;
  viewerId: string;
  viewedAt: any;
}

export interface MomentLike {
  momentId: string;
  userId: string;
  createdAt: any;
}

export interface MomentComment {
  id: string;
  momentId: string;
  userId: string;
  text: string;
  createdAt: any;
}

// ==================== THOUGHTS (NOTES) ====================

export interface Thought {
  id: string;
  userId: string;
  text: string;           // Max 60 chars
  emoji?: string;
  createdAt: any;
  expiresAt: any;         // 24h from creation
}
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'pulse';
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

export enum ViewState {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
  MESSAGES = 'MESSAGES',
  NOTIFICATIONS = 'NOTIFICATIONS',
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

// App Update System
export interface AppUpdateMetadata {
  latestVersion: string;
  apkUrl: string;
  assetUrl?: string; // URL for asset bundle or manifest
  forceUpdate: boolean;
  assetVersion: string;
  configVersion: string;
  releaseNotes?: string;
  minVersion?: string;
}

export interface AppRemoteConfig {
  memoryUIVersion?: string;
  chatFixEnabled?: boolean;
  newEncryptionHandler?: boolean;
  [key: string]: any;
}
