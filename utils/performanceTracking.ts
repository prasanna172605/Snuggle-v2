/**
 * Performance Monitoring - Web Vitals
 * Track Core Web Vitals and custom metrics
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { logger } from './logger';
import { config } from '@/config/environment';

export interface PerformanceMetric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    path?: string;
}

/**
 * Initialize Web Vitals tracking
 */
export function initPerformanceMonitoring(): void {
    if (!config.analytics.enabled) return;

    // Largest Contentful Paint
    getLCP((metric) => {
        reportWebVital('LCP', metric.value, metric.rating);
    });

    // First Input Delay
    getFID((metric) => {
        reportWebVital('FID', metric.value, metric.rating);
    });

    // Cumulative Layout Shift
    getCLS((metric) => {
        reportWebVital('CLS', metric.value, metric.rating);
    });

    // First Contentful Paint
    getFCP((metric) => {
        reportWebVital('FCP', metric.value, metric.rating);
    });

    // Time to First Byte
    getTTFB((metric) => {
        reportWebVital('TTFB', metric.value, metric.rating);
    });
}

/**
 * Report Web Vital metric
 */
function reportWebVital(name: string, value: number, rating: string): void {
    logger.metric(name, value, {
        feature: 'web-vitals',
        rating,
    });

    // Send to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', name, {
            event_category: 'Web Vitals',
            value: Math.round(value),
            event_label: rating,
            non_interaction: true,
        });
    }
}

/**
 * Measure custom performance metric
 */
export function measurePerformance(name: string): () => void {
    const startTime = performance.now();

    return () => {
        const duration = performance.now() - startTime;
        logger.metric(name, duration, {
            feature: 'custom-metric',
        });
    };
}

/**
 * Track route change performance
 */
export function trackRouteChange(path: string): void {
    const measure = measurePerformance(`route_change_${path}`);

    // Wait for next frame to measure
    requestAnimationFrame(() => {
        measure();
    });
}

/**
 * Track API call performance
 */
export function trackApiCall(endpoint: string, duration: number, success: boolean): void {
    logger.metric(`api_${endpoint}`, duration, {
        feature: 'api',
        success: success.toString(),
    });
}

/**
 * Track Firebase operation performance
 */
export function trackFirebaseOperation(operation: string, duration: number): void {
    logger.metric(`firebase_${operation}`, duration, {
        feature: 'firebase',
    });
}

/**
 * Track component render performance
 */
export function trackComponentRender(componentName: string, duration: number): void {
    // Only track in development
    if (config.env !== 'development') return;

    logger.debug(`Component render: ${componentName}`, {
        feature: 'component-performance',
        duration,
    });
}

export default {
    initPerformanceMonitoring,
    measurePerformance,
    trackRouteChange,
    trackApiCall,
    trackFirebaseOperation,
    trackComponentRender,
};
