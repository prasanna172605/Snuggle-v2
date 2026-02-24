import { useState, useEffect } from 'react';

/**
 * Hook that tracks whether the app is actively visible.
 * Uses `document.visibilitychange` (web/PWA) and optionally
 * Capacitor `App.addListener('appStateChange')` for native.
 *
 * Components can use `isActive` to pause expensive subscriptions,
 * animations, or listeners when the user backgrounds the app.
 */
export function useAppState() {
  const [isActive, setIsActive] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibility = () => setIsActive(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);

    // Capacitor native hook (optional — no-ops if not installed)
    let capacitorUnsub: (() => void) | undefined;
    try {
      // Dynamic import so it doesn't crash in web-only builds
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive: active }) => {
          setIsActive(active);
        }).then(handle => {
          capacitorUnsub = () => handle.remove();
        });
      }).catch(() => {
        // @capacitor/app not installed — web-only, ignore
      });
    } catch {
      // ignored
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      capacitorUnsub?.();
    };
  }, []);

  return isActive;
}
