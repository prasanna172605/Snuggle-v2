/**
 * Firebase Query Optimization Utilities
 * Best practices for Realtime Database queries
 */

import { ref, query, orderByChild, limitToLast, startAt, endAt } from 'firebase/database';
import { database } from './firebase';

/**
 * Query messages for a chat with pagination
 * @param chatId - Chat ID
 * @param limit - Number of messages to fetch (default: 50)
 * @returns Query reference
 */
export function getMessagesQuery(chatId: string, limit: number = 50) {
    const messagesRef = ref(database, `messages/${chatId}`);
    return query(
        messagesRef,
        orderByChild('timestamp'),
        limitToLast(limit)
    );
}

/**
 * Query user's chats ordered by last message
 * @param userId - User ID
 * @param limit - Number of chats to fetch (default: 20)
 */
export function getUserChatsQuery(userId: string, limit: number = 20) {
    const chatsRef = ref(database, `chats`);
    return query(
        chatsRef,
        orderByChild(`participants/${userId}`),
        limitToLast(limit)
    );
}

/**
 * Query notifications for a user
 * @param userId - User ID
 * @param limit - Number of notifications (default: 30)
 */
export function getNotificationsQuery(userId: string, limit: number = 30) {
    const notificationsRef = ref(database, `notifications/${userId}`);
    return query(
        notificationsRef,
        orderByChild('createdAt'),
        limitToLast(limit)
    );
}

/**
 * Listener Manager - Track and cleanup active listeners
 */
class ListenerManager {
    private listeners: Map<string, () => void> = new Map();

    /**
     * Register a listener with a unique key
     */
    register(key: string, unsubscribe: () => void): void {
        // If listener already exists, unsubscribe first
        this.unregister(key);
        this.listeners.set(key, unsubscribe);
    }

    /**
     * Unregister and cleanup a specific listener
     */
    unregister(key: string): void {
        const unsubscribe = this.listeners.get(key);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(key);
        }
    }

    /**
     * Cleanup all listeners
     */
    cleanup(): void {
        this.listeners.forEach((unsubscribe) => unsubscribe());
        this.listeners.clear();
    }

    /**
     * Get count of active listeners
     */
    getCount(): number {
        return this.listeners.size;
    }
}

export const listenerManager = new ListenerManager();

/**
 * Batching utility for Firebase writes
 */
export class WriteBatcher {
    private batch: Array<() => Promise<void>> = [];
    private timeout: NodeJS.Timeout | null = null;
    private batchDelay: number;

    constructor(delayMs: number = 100) {
        this.batchDelay = delayMs;
    }

    /**
     * Add a write operation to the batch
     */
    add(writeOperation: () => Promise<void>): void {
        this.batch.push(writeOperation);
        this.scheduleBatch();
    }

    /**
     * Schedule batch execution
     */
    private scheduleBatch(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(() => {
            this.executeBatch();
        }, this.batchDelay);
    }

    /**
     * Execute all batched writes
     */
    private async executeBatch(): Promise<void> {
        const operations = [...this.batch];
        this.batch = [];

        try {
            await Promise.all(operations.map(op => op()));
        } catch (error) {
            console.error('Batch write error:', error);
        }
    }

    /**
     * Force immediate execution
     */
    async flush(): Promise<void> {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        await this.executeBatch();
    }
}

/**
 * Cache manager for frequently accessed data
 */
class CacheManager {
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private ttl: number;

    constructor(ttlSeconds: number = 300) {
        this.ttl = ttlSeconds * 1000; // Convert to ms
    }

    /**
     * Get cached data if still valid
     */
    get<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return cached.data as T;
    }

    /**
     * Set cache data
     */
    set(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    /**
     * Clear specific cache entry
     */
    clear(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clearAll(): void {
        this.cache.clear();
    }
}

export const cacheManager = new CacheManager(300); // 5 minute TTL

export default {
    getMessagesQuery,
    getUserChatsQuery,
    getNotificationsQuery,
    listenerManager,
    WriteBatcher,
    cacheManager,
};
