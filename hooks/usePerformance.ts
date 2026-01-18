import { useEffect, useRef, useCallback } from 'react';

/**
 * Debounce hook - delays execution until after wait time
 * Use for: search, typing indicators
 */
export function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, delay]
    );
}

/**
 * Throttle hook - executes at most once per wait time
 * Use for: scroll listeners, resize handlers
 */
export function useThrottle<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const lastRun = useRef(Date.now());

    return useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            if (now - lastRun.current >= delay) {
                callback(...args);
                lastRun.current = now;
            }
        },
        [callback, delay]
    );
}

/**
 * Debounced value hook
 * Returns a debounced version of the value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Intersection Observer hook for lazy loading
 * Use for: lazy loading images, infinite scroll
 */
export function useIntersectionObserver(
    elementRef: React.RefObject<Element>,
    options?: IntersectionObserverInit
): boolean {
    const [isIntersecting, setIsIntersecting] = React.useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
        }, options);

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [elementRef, options]);

    return isIntersecting;
}

/**
 * Hook to detect if user is offline
 */
export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

export default {
    useDebounce,
    useThrottle,
    useDebouncedValue,
    useIntersectionObserver,
    useOnlineStatus,
};
