import React, { useState } from 'react';
import { Palette, Upload, X } from 'lucide-react';
import { chatThemeService, PRESET_THEMES, ChatTheme } from '@/services/chatThemeService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatThemePickerProps {
    chatId: string;
    currentTheme: ChatTheme;
    onClose: () => void;
}

export function ChatThemePicker({ chatId, currentTheme, onClose }: ChatThemePickerProps) {
    const { currentUser } = useAuth();
    const [selectedTheme, setSelectedTheme] = useState<ChatTheme>(currentTheme);
    const [isUploading, setIsUploading] = useState(false);

    const handlePresetSelect = (theme: ChatTheme) => {
        setSelectedTheme(theme);
    };

    const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        setIsUploading(true);
        try {
            const url = await chatThemeService.uploadWallpaper(chatId, file, currentUser.uid);

            setSelectedTheme({
                ...selectedTheme,
                backgroundType: 'image',
                backgroundValue: url,
            });

            toast.success('Wallpaper uploaded');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload wallpaper');
        } finally {
            setIsUploading(false);
        }
    };

    const handleApply = async () => {
        if (!currentUser) return;

        try {
            await chatThemeService.updateChatTheme(chatId, selectedTheme, currentUser.uid);
            toast.success('Theme applied');
            onClose();
        } catch (error) {
            toast.error('Failed to apply theme');
        }
    };

    const handleReset = async () => {
        if (!currentUser) return;

        try {
            await chatThemeService.resetChatTheme(chatId, currentUser.uid);
            toast.success('Theme reset to default');
            onClose();
        } catch (error) {
            toast.error('Failed to reset theme');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white dark:bg-gray-900 w-full md:max-w-2xl md:rounded-lg rounded-t-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Customize Chat</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Preview */}
                <div className="p-4 border-b dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Preview</p>
                    <ChatPreview theme={selectedTheme} />
                </div>

                {/* Preset Themes */}
                <div className="p-4 border-b dark:border-gray-700">
                    <p className="text-sm font-medium mb-3">Preset Themes</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(PRESET_THEMES).map(([name, theme]) => (
                            <button
                                key={name}
                                onClick={() => handlePresetSelect(theme)}
                                className={cn(
                                    'p-3 rounded-lg border-2 transition-all',
                                    selectedTheme === theme
                                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/20'
                                        : 'border-gray-300 dark:border-gray-700 hover:border-cyan-400'
                                )}
                            >
                                <div className="flex gap-1 mb-2">
                                    <div
                                        className="w-6 h-6 rounded"
                                        style={{ backgroundColor: theme.bubbleSent }}
                                    />
                                    <div
                                        className="w-6 h-6 rounded"
                                        style={{ backgroundColor: theme.bubbleReceived }}
                                    />
                                </div>
                                <p className="text-xs capitalize">{name}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Upload Wallpaper */}
                <div className="p-4 border-b dark:border-gray-700">
                    <p className="text-sm font-medium mb-3">Custom Wallpaper</p>
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">
                            {isUploading ? 'Uploading...' : 'Upload Image'}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleWallpaperUpload}
                            disabled={isUploading}
                            className="hidden"
                        />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Max 5MB, JPG/PNG</p>
                </div>

                {/* Actions */}
                <div className="p-4 flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChatPreview({ theme }: { theme: ChatTheme }) {
    return (
        <div
            className="relative h-48 rounded-lg overflow-hidden"
            style={{
                backgroundColor: theme.backgroundType === 'color' ? theme.backgroundValue : '#fff',
            }}
        >
            {theme.backgroundType === 'image' && (
                <>
                    <img
                        src={theme.backgroundValue}
                        alt="Wallpaper"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{
                            filter: `blur(${theme.blur || 0}px)`,
                        }}
                    />
                    <div
                        className="absolute inset-0 bg-black"
                        style={{ opacity: 1 - (theme.opacity || 0.9) }}
                    />
                </>
            )}

            <div className="relative p-4 space-y-2">
                {/* Sent bubble */}
                <div className="flex justify-end">
                    <div
                        className="px-3 py-2 rounded-lg max-w-[70%]"
                        style={{ backgroundColor: theme.bubbleSent }}
                    >
                        <p className="text-sm text-white">Hello!</p>
                    </div>
                </div>

                {/* Received bubble */}
                <div className="flex justify-start">
                    <div
                        className="px-3 py-2 rounded-lg max-w-[70%]"
                        style={{ backgroundColor: theme.bubbleReceived }}
                    >
                        <p className="text-sm text-gray-900 dark:text-gray-100">Hi there! 👋</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatThemePicker;
