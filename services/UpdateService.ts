import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AppUpdateMetadata, AppRemoteConfig } from '../types';

export const UpdateService = {
    /**
     * Fetch the latest update metadata from Firestore
     */
    fetchUpdateMetadata: async (): Promise<AppUpdateMetadata | null> => {
        try {
            const docRef = doc(db, 'app_updates', 'current');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as AppUpdateMetadata;
            }
            return null;
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
