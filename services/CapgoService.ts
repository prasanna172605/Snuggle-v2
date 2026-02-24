import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export const CapgoService = {
    /**
     * Initialize Capgo listeners and perform initial check
     */
    init: async () => {
        if (!Capacitor.isNativePlatform()) return;

        try {
            // Listen for update events if needed
            // For now we handle them manually in the check function
            console.log('[CapgoService] Initialized');
        } catch (error) {
            console.error('[CapgoService] Init failed:', error);
        }
    },

    /**
     * Check for and apply updates silently
     */
    checkAndApply: async (bundleUrl?: string, version?: string): Promise<boolean> => {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            console.log('[CapgoService] Checking for silent update...', { version });
            
            // If no bundleUrl is provided, we rely on Capgo's auto-check (if configured)
            // or we skip manual check
            if (!bundleUrl) {
                console.log('[CapgoService] No bundle URL provided, skipping manual check');
                return false;
            }

            // check if we already have this version applied
            const currentBundle = await CapacitorUpdater.current();
            if (currentBundle.bundle.id === version) {
                console.log('[CapgoService] Bundle version already current:', version);
                return false;
            }

            // Download and apply in background
            console.log('[CapgoService] Downloading update bundle...', bundleUrl);
            
            const result = await CapacitorUpdater.download({
                url: bundleUrl,
                version: version || 'latest'
            });

            if (result) {
                console.log('[CapgoService] Update downloaded, set as next...');
                await CapacitorUpdater.set(result);
                
                // Track that an update was applied to show "What's New" on next launch
                localStorage.setItem('snuggle_pending_whats_new', 'true');
                if (version) localStorage.setItem('snuggle_last_ota_version', version);
                
                return true;
            }

            return false;
        } catch (error) {
            console.error('[CapgoService] Update failed:', error);
            return false;
        }
    },

    /**
     * Get current bundle info
     */
    getCurrentInfo: async () => {
        if (!Capacitor.isNativePlatform()) return null;
        return await CapacitorUpdater.current();
    }
};
