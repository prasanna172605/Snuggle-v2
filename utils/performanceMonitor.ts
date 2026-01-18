import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
    fps: number;
    memoryUsage: number;
    connectionSpeed: string;
    isLowEndDevice: boolean;
}

/**
 * Hook to monitor app performance
 */
export function usePerformanceMonitor(): PerformanceMetrics {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fps: 60,
        memoryUsage: 0,
        connectionSpeed: 'unknown',
        isLowEndDevice: false,
    });

    useEffect(() => {
        // Detect low-end device
        const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false;

        // Check connection speed
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        const connectionSpeed = connection?.effectiveType || 'unknown';

        // Check memory (if available)
        const memory = (performance as any).memory;
        const memoryUsage = memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0;

        setMetrics({
            fps: 60, // Default, can be measured with requestAnimationFrame
            memoryUsage: Math.round(memoryUsage),
            connectionSpeed,
            isLowEndDevice: isLowEnd,
        });

        // Log performance warnings
        if (isLowEnd) {
            console.warn('[Performance] Low-end device detected - enabling optimizations');
        }
        if (connectionSpeed === 'slow-2g' || connectionSpeed === '2g') {
            console.warn('[Performance] Slow connection detected - reducing data usage');
        }
    }, []);

    return metrics;
}

/**
 * Performance observer for tracking metrics
 */
export function trackPerformance(metricName: string, value: number) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${metricName}: ${value}ms`);
    }

    // Send to analytics in production
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'timing_complete', {
            name: metricName,
            value: Math.round(value),
            event_category: 'Performance',
        });
    }
}

/**
 * Measure component render time
 */
export function measureRender(componentName: string): () => void {
    const startTime = performance.now();

    return () => {
        const duration = performance.now() - startTime;
        trackPerformance(`${componentName}_render`, duration);
    };
}

/**
 * Report Web Vitals
 */
export function reportWebVitals() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
                trackPerformance('LCP', entry.startTime);
            }
        }
    });

    try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
        // Browser doesn't support LCP
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            const fidEntry = entry as any;
            if (fidEntry.name === 'first-input') {
                trackPerformance('FID', fidEntry.processingStart - fidEntry.startTime);
            }
        }
    });

    try {
        fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
        // Browser doesn't support FID
    }
}

export default {
    usePerformanceMonitor,
    trackPerformance,
    measureRender,
    reportWebVitals,
};
