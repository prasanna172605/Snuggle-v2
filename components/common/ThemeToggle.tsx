import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
    const { theme, effectiveTheme, setTheme } = useTheme();

    return (
        <button
            onClick={() => {
                // Cycle through: light -> dark -> system -> light
                const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
                setTheme(next);
            }}
            className={cn(
                'relative inline-flex items-center justify-center',
                'w-10 h-10 rounded-full',
                'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
                'transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500',
                className
            )}
            aria-label="Toggle theme"
        >
            {theme === 'system' ? (
                <Monitor className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : effectiveTheme === 'dark' ? (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : (
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            )}
        </button>
    );
};

export const ThemeSwitch: React.FC = () => {
    const { effectiveTheme, toggleTheme } = useTheme();

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {effectiveTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <button
                onClick={toggleTheme}
                className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    effectiveTheme === 'dark' ? 'bg-cyan-600' : 'bg-gray-300'
                )}
                aria-label="Toggle dark mode"
            >
                <span
                    className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        effectiveTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    )}
                />
            </button>
        </div>
    );
};

export default ThemeToggle;
