import React, { useEffect, useState } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const UPDATE_URL = 'https://snuggle-73465.web.app/version.json';

export const Updater: React.FC = () => {
    const [updateAvailable, setUpdateAvailable] = useState<any>(null);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const checkUpdate = async () => {
            try {
                const res = await fetch(UPDATE_URL);
                const latest = await res.json();
                
                // Get current app version from plugin
                // Note: In dev/web this might fail, so we wrap in try/catch or check platform
                const current = await CapacitorUpdater.current() as any;
                
                console.log('Current Version:', current.version);
                console.log('Latest Version:', latest.version);

                if (latest.version !== current.version) {
                    setUpdateAvailable(latest);
                }
            } catch (error) {
                console.error('Failed to check for updates:', error);
            }
        };

        // Check on mount and every 1 hour
        checkUpdate();
        const interval = setInterval(checkUpdate, 3600000);
        return () => clearInterval(interval);
    }, []);

    const handleUpdate = async () => {
        if (!updateAvailable) return;
        setDownloading(true);

        try {
            const version = await CapacitorUpdater.download({
                url: updateAvailable.url,
                version: updateAvailable.version,
            });
            
            setDownloading(false);
            
            // Ask user to restart now
            const confirm = window.confirm('Update downloaded! Restart now to apply?');
            if (confirm) {
                await CapacitorUpdater.set(version);
            }
        } catch (error) {
            console.error('Update failed:', error);
            setDownloading(false);
            toast.error('Update failed. Please try again later.');
        }
    };

    if (!updateAvailable) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 50,
            backgroundColor: 'var(--card)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            maxWidth: '24rem',
            animation: 'slide-in-from-bottom 0.3s ease-out'
        }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} />
                Update Available
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '16px' }}>
                Version {updateAvailable.version} is available.
                {updateAvailable.note && <span style={{ display: 'block', fontStyle: 'italic', marginTop: '4px' }}>"{updateAvailable.note}"</span>}
            </p>
            <button 
                onClick={handleUpdate} 
                disabled={downloading} 
                style={{
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: downloading ? 'not-allowed' : 'pointer',
                    opacity: downloading ? 0.7 : 1
                }}
            >
                {downloading ? (
                    'Downloading...'
                ) : (
                    <>
                        <Download size={16} style={{ marginRight: '8px' }} />
                        Update Now
                    </>
                )}
            </button>
        </div>
    );
};
