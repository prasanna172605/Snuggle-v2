import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export const ApkUpdater = {
    /**
     * Compare native app version with remote version and prompt for update
     */
    checkAndPrompt: async (latestVersion: string, apkUrl: string, forceUpdate: boolean): Promise<void> => {
        if (!Capacitor.isNativePlatform() || !apkUrl) return;

        try {
            const info = await App.getInfo();
            const currentVersion = info.version;

            if (ApkUpdater.compareVersions(latestVersion, currentVersion) > 0) {
                console.log('[ApkUpdater] Native update available:', { currentVersion, latestVersion, forceUpdate });
                
                if (forceUpdate) {
                    // Blocking prompt (handled by UI, here we just trigger or providing data)
                    ApkUpdater.triggerInstall(apkUrl);
                } else {
                    // Optional prompt
                    toast('New Native Update Available', {
                        description: `Version ${latestVersion} is ready to install.`,
                        action: {
                            label: 'Update Now',
                            onClick: () => ApkUpdater.triggerInstall(apkUrl)
                        },
                        duration: 10000
                    });
                }
            }
        } catch (error) {
            console.error('[ApkUpdater] Check failed:', error);
        }
    },

    /**
     * Trigger APK installation
     * Direct browser open is the most reliable way without custom native plugins
     */
    triggerInstall: async (apkUrl: string): Promise<void> => {
        try {
            console.log('[ApkUpdater] Triggering install from:', apkUrl);
            await Browser.open({ url: apkUrl, windowName: '_system' });
        } catch (error) {
            console.error('[ApkUpdater] Failed to open installer URL', error);
            toast.error('Failed to open update link. Please download manually.');
        }
    },

    /**
     * Simple semantic version comparison
     */
    compareVersions: (v1: string, v2: string): number => {
        const parts1 = v1.replace(/^v/, '').split('.').map(Number);
        const parts2 = v2.replace(/^v/, '').split('.').map(Number);
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }
};
