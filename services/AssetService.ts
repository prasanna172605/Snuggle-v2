import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const AssetService = {
    /**
     * Sync UI assets if version has changed
     * Note: This assumes assets are mapped in a manifest or specific structure
     */
    sync: async (remoteAssetVersion: string, assetUrl?: string): Promise<void> => {
        if (!Capacitor.isNativePlatform() || !assetUrl) return;

        try {
            const localVersion = localStorage.getItem('snuggle_asset_version');
            
            if (remoteAssetVersion !== localVersion) {
                console.log('[AssetService] Syncing assets...', { localVersion, remoteAssetVersion });
                
                // Example: Download a specific asset or manifest
                const response = await fetch(assetUrl);
                if (!response.ok) throw new Error('Failed to fetch assets');
                
                const data = await response.text();
                
                // Save to Filesystem
                await Filesystem.writeFile({
                    path: 'assets/ui-manifest.json',
                    data: data,
                    directory: Directory.Data,
                    encoding: Encoding.UTF8,
                    recursive: true
                });

                localStorage.setItem('snuggle_asset_version', remoteAssetVersion);
                console.log('[AssetService] Assets synced successfully');
            }
        } catch (error) {
            console.error('[AssetService] Sync failed:', error);
        }
    },

    /**
     * Read a cached asset from Filesystem
     */
    getAsset: async (path: string): Promise<string | null> => {
        try {
            const result = await Filesystem.readFile({
                path: `assets/${path}`,
                directory: Directory.Data,
                encoding: Encoding.UTF8
            });
            return result.data as string;
        } catch (error) {
            console.warn('[AssetService] Asset not found:', path);
            return null;
        }
    }
};
