import React, { useEffect, useState } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { App } from '@capacitor/app';

const UPDATE_URL = 'https://snuggle-73465.web.app/version.json';

// Helper to compare versions (v1 > v2 return 1, v1 < v2 return -1, equal return 0)
const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
};

export const Updater: React.FC = () => {
    const [updateAvailable, setUpdateAvailable] = useState<any>(null);
    const [downloading, setDownloading] = useState(false);
    const [isForced, setIsForced] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // Initial check
    useEffect(() => {
        // Run on mount
        checkUpdate();

        // Also run when app is resumed (brought to foreground)
        const listener = App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
            if (isActive) {
                checkUpdate();
            }
        });

        const interval = setInterval(checkUpdate, 3600000); // Every hour
        
        return () => {
            clearInterval(interval);
            listener.then((handle: any) => handle.remove());
        };
    }, []);

    const checkUpdate = async () => {
        if (!Capacitor.isNativePlatform()) return;

        try {
            console.log('[Updater] Checking for updates...');
            // 1. Fetch remote version info
            const res = await fetch(UPDATE_URL, { cache: 'no-store' }); // Prevent caching
            if (!res.ok) throw new Error('Failed to fetch update info');
            const latest = await res.json();
            
            // 2. Get current app version
            const current = await CapacitorUpdater.current() as any;
            
            console.log(`[Updater] Current: ${current.version}, Latest: ${latest.version}, Min: ${latest.minVersion}`);

            // 3. Compare versions
            // Check if update is available (Latest > Current)
            if (compareVersions(latest.version, current.version) > 0) {
                
                // Check if it's a FORCED update (Current < MinVersion)
                if (latest.minVersion && compareVersions(current.version, latest.minVersion) < 0) {
                    console.log('[Updater] Force update required!');
                    setIsForced(true);
                    setUpdateAvailable(latest);
                } else {
                    // Silent update: Auto download and set without UI
                    setIsForced(false);
                    console.log('[Updater] Silent update available via auto-download');
                    // Trigger download immediately
                    const triggerSilentUpdate = async () => {
                        try {
                            const version = await CapacitorUpdater.download({
                                url: latest.url,
                                version: latest.version,
                            });
                            // Set immediate to true if we want it to apply on next reload/resume
                            // Some versions of capgo use set({ id: version.id })
                            await CapacitorUpdater.set({ id: version.id });
                        } catch (e) {
                            console.error('[Updater] Silent update failed', e);
                        }
                    };
                    triggerSilentUpdate();
                }
            } else {
                // Up to date
                setUpdateAvailable(null);
                setIsForced(false);
            }
        } catch (error) {
            console.error('[Updater] Failed to check for updates:', error);
        }
    };

    const handleUpdate = async () => {
        if (!updateAvailable) return;
        setDownloading(true);

        try {
            // Download payload
            const version = await CapacitorUpdater.download({
                url: updateAvailable.url,
                version: updateAvailable.version,
            });
            
            setDownloading(false);
            
            // If forced, we don't ask, we just restart/set
            // Actually, we must set it.
            await CapacitorUpdater.set(version);
            
            // For good measure, reload the app if the plugin doesn't do it automatically immediately
            // (The plugin usually requires a restart, set() schedules it for next launch or immediate depending on config,
            // usually better to just notify or rely on logic. But for forced, we want immediate.)
            
            // Note: CapacitorUpdater.set() usually restarts the app on Android/iOS immediately or on next resume.
            // Let's hide the modal just in case, or show "Restarting..."
            
        } catch (error) {
            console.error('[Updater] Update failed:', error);
            setDownloading(false);
            toast.error('Update failed. Please check internet connection.');
        }
    };

    if (!updateAvailable) return null;

    // --- FORCED UPDATE UI (Blocking, Full Screen) ---
    if (isForced) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl border border-white/10">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Update Required
                    </h2>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        This version of Snuggle is no longer supported. Please update to continue using the app.
                    </p>

                    {updateAvailable.note && (
                        <div className="bg-gray-100 dark:bg-zinc-800/50 p-4 rounded-xl mb-6 text-sm text-gray-700 dark:text-gray-300">
                             "{updateAvailable.note}"
                        </div>
                    )}

                    <button 
                        onClick={handleUpdate}
                        disabled={downloading}
                        className="w-full py-4 bg-snuggle-500 hover:bg-snuggle-600 active:scale-95 transition-all text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-lg shadow-lg shadow-snuggle-500/20"
                    >
                        {downloading ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" /> 
                                Updating...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                Update Now (v{updateAvailable.version})
                            </>
                        )}
                    </button>
                    
                    {downloading && (
                         <p className="text-xs text-gray-400 mt-4 animate-pulse">
                             Please do not close the app...
                         </p>
                    )}
                </div>
            </div>
        );
    }

    // --- OPTIONAL UPDATE UI (Auto-Update Silently) ---
    // Instead of showing a prompt, we just download and update in background if not forced.
    // However, if we want to be completely silent, we don't render anything here.
    // The checkUpdate function handles the logic.

    return null;
};
