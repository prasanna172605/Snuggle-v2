import React, { useState, useEffect } from 'react';
import { Smartphone, Download, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const APK_DOWNLOAD_URL = 'https://snuggle-73465.web.app/snuggle.apk'; // Update with actual URL

export const MobileGateway: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detect mobile device
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const mobileCheck = /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase());
        
        // Don't show if already in standalone/native mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        
        if (mobileCheck && !isStandalone) {
            setIsMobile(true);
            
            // Show gateway after a short delay
            const timer = setTimeout(() => {
                const hasClosed = localStorage.getItem('snuggle_gateway_dismissed');
                if (!hasClosed) setIsVisible(true);
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, []);

    const handleOpenApp = () => {
        // Attempt to open via custom scheme
        window.location.href = 'snuggle://home';
        
        // Fallback timer: if app doesn't open, stay on page or show download
        setTimeout(() => {
            console.log('[MobileGateway] App failed to open, staying on gateway');
        }, 1500);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('snuggle_gateway_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed inset-x-0 bottom-0 z-[100] p-4 pb-8 md:hidden"
            >
                <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col items-center text-center">
                    <button 
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-16 h-16 bg-[#00f5d4]/10 rounded-3xl flex items-center justify-center mb-4">
                        <Smartphone className="w-8 h-8 text-[#00f5d4]" />
                    </div>

                    <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                        Get the Snuggle App
                    </h2>
                    
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 px-4">
                        Experience Snuggle at its best with notifications, faster performance, and more!
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        <button 
                            onClick={handleOpenApp}
                            className="w-full py-4 bg-[#00f5d4] text-black font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-[#00f5d4]/20"
                        >
                            <ExternalLink className="w-5 h-5" />
                            Open in App
                        </button>

                        <a 
                            href={APK_DOWNLOAD_URL}
                            className="w-full py-4 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <Download className="w-5 h-5" />
                            Download APK
                        </a>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
