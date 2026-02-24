import { UpdateService } from './UpdateService';
import { ConfigService } from './ConfigService';
import { AssetService } from './AssetService';
import { ApkUpdater } from './ApkUpdater';
import { CapgoService } from './CapgoService';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { toast } from 'sonner';

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
            if (metadata.configVersion && metadata.configVersion !== localConfigVersion) {
                await ConfigService.sync(metadata.configVersion);
                updateFound = true;
            }

            // 3. Check for Native Update (Mandatory or Optional)
            if (Capacitor.isNativePlatform()) {
                const info = await App.getInfo();
                const currentVersion = info.version;
                const isMandatory = !!metadata.forceUpdate || 
                                   (!!metadata.minVersion && ApkUpdater.compareVersions(metadata.minVersion, currentVersion) > 0);

                if (ApkUpdater.compareVersions(metadata.latestVersion, currentVersion) > 0) {
                    console.log('[UpdateManager] Native APK update found:', metadata.latestVersion);
                    updateFound = true;
                    
                    // Dispatch event for Updater component to show UI if mandatory
                    if (isMandatory) {
                        window.dispatchEvent(new CustomEvent('snuggle-update-found', { detail: metadata }));
                    }

                    await ApkUpdater.checkAndPrompt(
                        metadata.latestVersion,
                        metadata.apkUrl,
                        isMandatory
                    );
                    
                    // If mandatory, we stop here to avoid conflicting with OTA
                    if (isMandatory) return true;
                }

                // 4. Handle Silent OTA Update (Capgo)
                // If native version is fine, check for silent bundle updates
                if (metadata.assetUrl && metadata.assetVersion) {
                    const otaApplied = await CapgoService.checkAndApply(metadata.assetUrl, metadata.assetVersion);
                    if (otaApplied) {
                        updateFound = true;
                        console.log('[UpdateManager] Silent OTA update applied and pending restart.');
                    }
                }
            } else {
                // Web-only asset syncing (Legacy or internal)
                const localAssetVersion = localStorage.getItem('snuggle_asset_version');
                if (metadata.assetVersion && metadata.assetUrl && metadata.assetVersion !== localAssetVersion) {
                    await AssetService.sync(metadata.assetVersion, metadata.assetUrl);
                    updateFound = true;
                }
            }

            // 5. Check for "What's New" notification
            UpdateManager.checkWhatsNew(metadata.releaseNotes);

            console.log('[UpdateManager] Update check completed, status:', updateFound);
            return updateFound;
        } catch (error) {
            console.error('[UpdateManager] Pipeline failed:', error);
            return false;
        }
    },

    /**
     * Check if a silent update was recently applied and notify user
     */
    checkWhatsNew: (releaseNotes?: string) => {
        const isNewLaunch = localStorage.getItem('snuggle_pending_whats_new') === 'true';
        if (isNewLaunch) {
            localStorage.removeItem('snuggle_pending_whats_new');
            toast('App Updated Successfully', {
                description: releaseNotes || 'Minor improvements and bug fixes applied.',
                duration: 5000,
                position: 'top-center'
            });
        }
    }
};
