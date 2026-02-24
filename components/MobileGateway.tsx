import React, { useState, useEffect } from 'react';
import { Smartphone, Download, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const APK_DOWNLOAD_URL = 'https://snuggle-73465.web.app/snuggle-app.zip'; // Zipped to bypass Hosting restrictions

export const MobileGateway: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState<'INITIAL' | 'REDIRECTING' | 'DOWNLOAD'>('INITIAL');

    useEffect(() => {
        // Detect mobile device
        const userAgent = (navigator.userAgent || navigator.vendor || (window as any).opera).toLowerCase();
        const mobileCheck = /android|iphone|ipad|ipod/i.test(userAgent);
        
        // Don't show if already in standalone/native mode or Capacitor
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        const isNative = (window as any).Capacitor?.isNativePlatform();

        if (mobileCheck && !isStandalone && !isNative) {
            setIsVisible(true);
            setStatus('REDIRECTING');
            
            // 1. Attempt professional direct redirection
            // First try the custom scheme which is more likely to work for direct opening
            window.location.href = 'snuggle://home';
            
            // 2. Also try the HTTPS App Link as a secondary check
            setTimeout(() => {
                // If not redirected by scheme, try the HTTPS link
                // browsers sometimes block scheme redirection without user gesture, 
                // but App Links might work.
                console.log('[MobileGateway] Attempting HTTPS fallback...');
            }, 1000);

            // Give the browser a moment to try launching the app
            const timer = setTimeout(() => {
                setStatus('DOWNLOAD');
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleOpenApp = () => {
        // Force the app open via custom scheme (most reliable for manual trigger)
        window.location.href = 'snuggle://home';
        
        // No secondary HTTPS reload here as it just causes the reload the user complained about
        console.log('[MobileGateway] Opening via custom scheme...');
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[9999] bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center"
            >
                <div className="max-w-xs w-full">
                    <motion.div 
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="w-24 h-24 bg-[#00f5d4]/10 rounded-[32px] flex items-center justify-center mb-8 mx-auto"
                    >
                        <Smartphone className="w-12 h-12 text-[#00f5d4]" />
                    </motion.div>

                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
                        Snuggle is better <br/> in the app
                    </h1>
                    
                    <p className="text-gray-500 dark:text-zinc-400 text-lg mb-10 px-2">
                        {status === 'REDIRECTING' 
                            ? "Opening Snuggle..." 
                            : "The web version is no longer supported on mobile. Please use our native app for the full experience."}
                    </p>

                    <div className="flex flex-col gap-4 w-full">
                        {status === 'REDIRECTING' ? (
                            <div className="flex items-center justify-center py-4">
                                <div className="w-8 h-8 border-4 border-[#00f5d4] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                <a 
                                    href={APK_DOWNLOAD_URL}
                                    className="w-full py-5 bg-[#00f5d4] text-black font-black text-lg rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-xl shadow-[#00f5d4]/30"
                                >
                                    <Download className="w-6 h-6" />
                                    Download App
                                </a>

                                <button 
                                    onClick={handleOpenApp}
                                    className="w-full py-4 text-gray-500 dark:text-zinc-500 font-bold hover:text-[#00f5d4] transition-colors flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Already have the app?
                                </button>
                            </>
                        )}
                    </div>

                    <div className="mt-12 text-zinc-400 dark:text-zinc-600 text-sm">
                        v{APK_DOWNLOAD_URL.split('/').pop()?.replace('.apk', '') || 'Latest'}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
