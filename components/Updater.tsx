import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { ApkUpdater } from '../services/ApkUpdater';
import { AppUpdateMetadata } from '../types';

export const Updater: React.FC = () => {
    const [updateAvailable, setUpdateAvailable] = useState<AppUpdateMetadata | null>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const handleUpdateFound = (e: any) => {
            const metadata = e.detail;
            console.log('[Updater UI] Update metadata received:', metadata);
            setUpdateAvailable(metadata);
        };

        window.addEventListener('snuggle-update-found', handleUpdateFound);
        return () => window.removeEventListener('snuggle-update-found', handleUpdateFound);
    }, []);

    if (!updateAvailable) return null;

    const isForced = updateAvailable.forceUpdate;

    const handleUpdate = async () => {
        setDownloading(true);
        try {
            await ApkUpdater.triggerInstall(updateAvailable.apkUrl);
        } finally {
            setDownloading(false);
        }
    };

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

                    {updateAvailable.releaseNotes && (
                        <div className="bg-gray-100 dark:bg-zinc-800/50 p-4 rounded-xl mb-6 text-sm text-gray-700 dark:text-gray-300">
                             "{updateAvailable.releaseNotes}"
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
                                Update Now (v{updateAvailable.latestVersion})
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Optional updates are handled via toasts in ApkUpdater.ts for now
    return null;
};
