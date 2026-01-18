/**
 * Chat Theme Service
 * Manages per-chat theming and wallpapers
 */

import { database, storage } from './firebase';
import { ref, set, get, onValue, serverTimestamp } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logger } from '@/utils/logger';

export type BackgroundType = 'color' | 'image';

export interface ChatTheme {
    backgroundType: BackgroundType;
    backgroundValue: string; // color hex or image URL
    bubbleSent: string;
    bubbleReceived: string;
    accent: string;
    opacity?: number; // 0-1 for wallpaper overlay
    blur?: number; // 0-20 for wallpaper blur
}

export interface ChatPreferences {
    theme: ChatTheme;
    updatedAt: number;
    updatedBy?: string;
}

// Default themes
export const DEFAULT_THEME: ChatTheme = {
    backgroundType: 'color',
    backgroundValue: '#FFFFFF',
    bubbleSent: '#3B82F6',
    bubbleReceived: '#E5E7EB',
    accent: '#10B981',
};

export const PRESET_THEMES: Record<string, ChatTheme> = {
    default: DEFAULT_THEME,
    dark: {
        backgroundType: 'color',
        backgroundValue: '#1F2937',
        bubbleSent: '#3B82F6',
        bubbleReceived: '#374151',
        accent: '#10B981',
    },
    pastel: {
        backgroundType: 'color',
        backgroundValue: '#FEF3C7',
        bubbleSent: '#FBBF24',
        bubbleReceived: '#FDE68A',
        accent: '#F59E0B',
    },
    ocean: {
        backgroundType: 'color',
        backgroundValue: '#DBEAFE',
        bubbleSent: '#2563EB',
        bubbleReceived: '#BFDBFE',
        accent: '#1D4ED8',
    },
    sunset: {
        backgroundType: 'color',
        backgroundValue: '#FEE2E2',
        bubbleSent: '#EF4444',
        bubbleReceived: '#FECACA',
        accent: '#DC2626',
    },
};

/**
 * Chat Theme Service
 */
class ChatThemeService {
    private themeCache = new Map<string, ChatTheme>();

    /**
     * Get chat theme preferences
     */
    async getChatTheme(chatId: string): Promise<ChatTheme> {
        // Check cache first
        if (this.themeCache.has(chatId)) {
            return this.themeCache.get(chatId)!;
        }

        try {
            const prefsRef = ref(database, `chatPreferences/${chatId}`);
            const snapshot = await get(prefsRef);

            if (snapshot.exists()) {
                const prefs = snapshot.val() as ChatPreferences;
                this.themeCache.set(chatId, prefs.theme);
                return prefs.theme;
            }

            return DEFAULT_THEME;
        } catch (error) {
            logger.error('Failed to get chat theme', error as Error, { chatId });
            return DEFAULT_THEME;
        }
    }

    /**
     * Update chat theme
     */
    async updateChatTheme(
        chatId: string,
        theme: ChatTheme,
        userId: string
    ): Promise<void> {
        try {
            const prefsRef = ref(database, `chatPreferences/${chatId}`);

            const preferences: ChatPreferences = {
                theme,
                updatedAt: Date.now(),
                updatedBy: userId,
            };

            await set(prefsRef, preferences);

            // Update cache
            this.themeCache.set(chatId, theme);

            logger.info('Chat theme updated', { chatId, userId });
        } catch (error) {
            logger.error('Failed to update chat theme', error as Error, { chatId });
            throw error;
        }
    }

    /**
     * Subscribe to chat theme changes
     */
    subscribeToChatTheme(
        chatId: string,
        callback: (theme: ChatTheme) => void
    ): () => void {
        const prefsRef = ref(database, `chatPreferences/${chatId}`);

        const unsubscribe = onValue(prefsRef, (snapshot) => {
            if (snapshot.exists()) {
                const prefs = snapshot.val() as ChatPreferences;
                this.themeCache.set(chatId, prefs.theme);
                callback(prefs.theme);
            } else {
                callback(DEFAULT_THEME);
            }
        });

        return unsubscribe;
    }

    /**
     * Upload wallpaper image
     */
    async uploadWallpaper(
        chatId: string,
        file: File,
        userId: string
    ): Promise<string> {
        try {
            // Validate file
            if (!file.type.startsWith('image/')) {
                throw new Error('File must be an image');
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Image must be less than 5MB');
            }

            // Upload to Storage
            const wallpaperRef = storageRef(
                storage,
                `chatWallpapers/${chatId}/${userId}_${Date.now()}.jpg`
            );

            await uploadBytes(wallpaperRef, file);
            const url = await getDownloadURL(wallpaperRef);

            logger.info('Wallpaper uploaded', { chatId, userId });

            return url;
        } catch (error) {
            logger.error('Failed to upload wallpaper', error as Error, { chatId });
            throw error;
        }
    }

    /**
     * Apply theme to CSS variables
     */
    applyChatTheme(element: HTMLElement, theme: ChatTheme): void {
        element.style.setProperty('--chat-bg', theme.backgroundValue);
        element.style.setProperty('--bubble-sent', theme.bubbleSent);
        element.style.setProperty('--bubble-received', theme.bubbleReceived);
        element.style.setProperty('--chat-accent', theme.accent);

        if (theme.backgroundType === 'image') {
            element.style.setProperty('--chat-bg-image', `url(${theme.backgroundValue})`);
            element.style.setProperty('--chat-bg-opacity', String(theme.opacity || 0.9));
            element.style.setProperty('--chat-bg-blur', `${theme.blur || 0}px`);
        } else {
            element.style.removeProperty('--chat-bg-image');
        }
    }

    /**
     * Reset to default theme
     */
    async resetChatTheme(chatId: string, userId: string): Promise<void> {
        await this.updateChatTheme(chatId, DEFAULT_THEME, userId);
    }

    /**
     * Validate color format
     */
    isValidColor(color: string): boolean {
        return /^#[0-9A-F]{6}$/i.test(color);
    }

    /**
     * Check contrast ratio (for accessibility)
     */
    hasGoodContrast(bg: string, fg: string): boolean {
        // Simplified contrast check
        // In production, use a proper contrast calculation library
        return true; // TODO: Implement proper contrast checking
    }
}

export const chatThemeService = new ChatThemeService();
export default chatThemeService;
