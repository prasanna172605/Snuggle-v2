/**
 * EncryptionBadge — Visual indicator for E2EE status
 * Shows a lock icon with encryption status in chat headers and call overlays
 */

import React, { useState } from 'react';

interface EncryptionBadgeProps {
    /** Whether the content is encrypted */
    encrypted?: boolean;
    /** Security verification code (for calls) */
    securityCode?: string | null;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Additional CSS classes */
    className?: string;
}

const EncryptionBadge: React.FC<EncryptionBadgeProps> = ({
    encrypted = true,
    securityCode,
    size = 'sm',
    className = '',
}) => {
    const [showDetails, setShowDetails] = useState(false);

    if (!encrypted) return null;

    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
    const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
    const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

    return (
        <div className={`relative inline-flex ${className}`}>
            {/* Badge */}
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`
                    inline-flex items-center gap-1 ${padding} rounded-full
                    bg-emerald-500/10 dark:bg-emerald-400/10
                    text-emerald-700 dark:text-emerald-400
                    hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20
                    transition-colors duration-200 cursor-pointer
                    border border-emerald-500/20 dark:border-emerald-400/20
                `}
                title="End-to-end encrypted"
            >
                {/* Lock Icon */}
                <svg
                    className={iconSize}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                </svg>
                <span className={`${textSize} font-medium leading-none`}>
                    Encrypted
                </span>
            </button>

            {/* Details Popover */}
            {showDetails && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDetails(false)}
                    />
                    {/* Popover */}
                    <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-xl
                        bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700
                        p-4 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    End-to-End Encrypted
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Messages are secured with AES-256
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Messages and calls are end-to-end encrypted. Only you and the other
                            person can read or hear them. Not even Snuggle can access them.
                        </p>

                        {securityCode && (
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                                    Safety Number
                                </p>
                                <p className="text-sm font-mono text-gray-900 dark:text-white tracking-widest bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center select-all">
                                    {securityCode}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                                    Compare this number with the other person to verify encryption.
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default EncryptionBadge;
