import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    effectiveTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

    // Get system preference
    const getSystemTheme = (): 'light' | 'dark' => {
        if (typeof window === 'undefined') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // Calculate effective theme
    const calculateEffectiveTheme = (selectedTheme: Theme): 'light' | 'dark' => {
        if (selectedTheme === 'system') {
            return getSystemTheme();
        }
        return selectedTheme;
    };

    // Initialize theme on mount
    useEffect(() => {
        // Get saved theme or default to system
        const savedTheme = (localStorage.getItem('snuggle-theme') as Theme) || 'system';
        setThemeState(savedTheme);

        const effective = calculateEffectiveTheme(savedTheme);
        setEffectiveTheme(effective);

        // Apply theme to document
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(effective);
    }, []);

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            const newTheme = e.matches ? 'dark' : 'light';
            setEffectiveTheme(newTheme);
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(newTheme);
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('snuggle-theme', newTheme);

        const effective = calculateEffectiveTheme(newTheme);
        setEffectiveTheme(effective);

        // Update document class
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(effective);
    };

    const toggleTheme = () => {
        // Simple toggle: light <-> dark (ignoring system for toggle)
        const newTheme = effectiveTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export default ThemeProvider;
