/**
 * Chat theme custom hook
 */

import { useState, useEffect, useRef } from 'react';
import { chatThemeService, ChatTheme, DEFAULT_THEME } from '@/services/chatThemeService';

/**
 * Hook to manage chat theme
 */
export function useChatTheme(chatId: string) {
    const [theme, setTheme] = useState<ChatTheme>(DEFAULT_THEME);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chatId) return;

        // Load initial theme
        chatThemeService.getChatTheme(chatId).then(initialTheme => {
            setTheme(initialTheme);
            setIsLoading(false);
        });

        // Subscribe to theme changes
        const unsubscribe = chatThemeService.subscribeToChatTheme(chatId, (newTheme) => {
            setTheme(newTheme);
        });

        return () => unsubscribe();
    }, [chatId]);

    // Apply theme to container
    useEffect(() => {
        if (containerRef.current && !isLoading) {
            chatThemeService.applyChatTheme(containerRef.current, theme);
        }
    }, [theme, isLoading]);

    return { theme, isLoading, containerRef };
}

export default useChatTheme;
