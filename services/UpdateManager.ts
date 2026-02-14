import { UpdateService } from './UpdateService';
import { ConfigService } from './ConfigService';
import { AssetService } from './AssetService';
import { ApkUpdater } from './ApkUpdater';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const UpdateManager = {
    /**
     * Run the automated update pipeline
     * Called on app startup and manually from Settings
     */
    run: async (): Promise<boolean> => {
        console.log('[UpdateManager] Starting update check...');
        let updateFound = false;
        
        try {
            // 1. Fetch metadata from Firestore
            const metadata = await UpdateService.fetchUpdateMetadata();
            if (!metadata) {
                console.log('[UpdateManager] No update metadata found or error fetching.');
                return false;
            }

            console.log('[UpdateManager] Metadata received:', {
                latest: metadata.latestVersion,
                config: metadata.configVersion,
                assets: metadata.assetVersion
            });

            // 2. Sync Remote Config (Silent)
            const localConfigVersion = localStorage.getItem('snuggle_config_version');
            if (metadata.configVersion !== localConfigVersion) {
                await ConfigService.sync(metadata.configVersion);
                updateFound = true;
            }

            // 3. Sync UI Assets (Silent)
            const localAssetVersion = localStorage.getItem('snuggle_asset_version');
            if (metadata.assetVersion && metadata.assetUrl && metadata.assetVersion !== localAssetVersion) {
                await AssetService.sync(metadata.assetVersion, metadata.assetUrl);
                updateFound = true;
            }

            // 4. Check for Native Update (Prompted)
            if (Capacitor.isNativePlatform()) {
                const info = await App.getInfo();
                const currentVersion = info.version;

                if (ApkUpdater.compareVersions(metadata.latestVersion, currentVersion) > 0) {
                    console.log('[UpdateManager] Native update found:', metadata.latestVersion);
                    updateFound = true;
                    
                    // Dispatch event for Updater component to show UI
                    window.dispatchEvent(new CustomEvent('snuggle-update-found', { detail: metadata }));
                    
                    await ApkUpdater.checkAndPrompt(
                        metadata.latestVersion,
                        metadata.apkUrl,
                        metadata.forceUpdate
                    );
                }
            }

            console.log('[UpdateManager] Update check completed, status:', updateFound);
            return updateFound;
        } catch (error) {
            console.error('[UpdateManager] Pipeline failed:', error);
            return false;
        }
    }
};
