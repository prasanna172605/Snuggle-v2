import { UpdateService } from './UpdateService';

export const ConfigService = {
    /**
     * Sync remote config if version has changed
     */
    sync: async (remoteVersion: string): Promise<void> => {
        try {
            const localVersion = localStorage.getItem('snuggle_config_version');
            
            if (remoteVersion !== localVersion) {
                console.log('[ConfigService] Syncing remote config...', { localVersion, remoteVersion });
                const config = await UpdateService.fetchRemoteConfig();
                
                if (config) {
                    localStorage.setItem('snuggle_remote_config', JSON.stringify(config));
                    localStorage.setItem('snuggle_config_version', remoteVersion);
                    
                    // Dispatch event for components to react to config changes
                    window.dispatchEvent(new CustomEvent('snuggle-config-updated', { detail: config }));
                    console.log('[ConfigService] Remote config synced successfully');
                }
            }
        } catch (error) {
            console.error('[ConfigService] Sync failed:', error);
        }
    },

    /**
     * Get a config value by key
     */
    get: <T>(key: string, defaultValue: T): T => {
        try {
            const configStr = localStorage.getItem('snuggle_remote_config');
            if (configStr) {
                const config = JSON.parse(configStr);
                return config[key] !== undefined ? config[key] : defaultValue;
            }
        } catch (e) {
            console.warn('[ConfigService] Failed to parse cached config', e);
        }
        return defaultValue;
    },

    /**
     * Get the entire remote config object
     */
    getAll: (): any => {
        try {
            const configStr = localStorage.getItem('snuggle_remote_config');
            return configStr ? JSON.parse(configStr) : {};
        } catch (e) {
            return {};
        }
    }
};
