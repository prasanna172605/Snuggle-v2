import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AppUpdateMetadata, AppRemoteConfig } from '../types';

export const UpdateService = {
    /**
     * Fetch the latest update metadata from the web server
     */
    fetchUpdateMetadata: async (): Promise<AppUpdateMetadata | null> => {
        try {
            const response = await fetch('https://snuggle-73465.web.app/version.json', {
                cache: 'no-store' // Avoid browser cache for metadata
            });
            if (!response.ok) throw new Error('Failed to fetch update metadata');
            
            const data = await response.json();
            
            // Map the flat version.json to AppUpdateMetadata type
            return {
                latestVersion: data.version,
                apkUrl: data.apkUrl || `https://snuggle-73465.web.app/snuggle.apk`,
                assetUrl: data.assetUrl || data.url, // Fallback to 'url' from deploy script
                assetVersion: data.version, // Use main version for assets too
                configVersion: data.configVersion || '1.0.0',
                forceUpdate: !!data.forceUpdate,
                minVersion: data.minVersion,
                releaseNotes: data.note
            };
        } catch (error) {
            console.error('[UpdateService] Error fetching update metadata:', error);
            return null;
        }
    },

    /**
     * Fetch the remote config from Firestore
     */
    fetchRemoteConfig: async (): Promise<AppRemoteConfig | null> => {
        try {
            const docRef = doc(db, 'app_config', 'main');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as AppRemoteConfig;
            }
            return null;
        } catch (error) {
            console.error('[UpdateService] Error fetching remote config:', error);
            return null;
        }
    }
};
