// Notification Types

export enum NotificationType {
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    LIKE = 'like',
    COMMENT = 'comment',
    FOLLOW = 'follow',
    MESSAGE = 'message'
}

export interface NotificationData {
    entityType?: string;  // 'post', 'comment', etc.
    entityId?: string;
    route?: string;       // Navigation path
    [key: string]: any;   // Additional custom data
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData;
    isRead: boolean;
    createdAt: number;
}

export interface NotificationPreferences {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    messages: boolean;
    system: boolean;
    sound: boolean;
    push: boolean;
}
