/**
 * Environment Configuration
 * Provides type-safe access to environment variables
 */

export type Environment = 'development' | 'staging' | 'production';

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
}

export interface AppConfig {
    env: Environment;
    firebase: FirebaseConfig;
    useEmulators: boolean;
    features: {
        darkMode: boolean;
        videoCalls: boolean;
        stories: boolean;
        circles: boolean;
    };
    analytics: {
        enabled: boolean;
    };
    api: {
        baseUrl: string;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
    };
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, defaultValue: string = ''): string {
    return import.meta.env[key] || defaultValue;
}

/**
 * Parse boolean from env var
 */
function parseBool(value: string): boolean {
    return value === 'true' || value === '1';
}

/**
 * Application configuration based on environment
 */
export const config: AppConfig = {
    env: (getEnvVar('VITE_APP_ENV', 'development') as Environment),

    firebase: {
        apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
        authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
        projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
        storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
        appId: getEnvVar('VITE_FIREBASE_APP_ID'),
        measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID'),
    },

    useEmulators: parseBool(getEnvVar('VITE_USE_EMULATORS', 'false')),

    features: {
        darkMode: parseBool(getEnvVar('VITE_FEATURE_DARK_MODE', 'true')),
        videoCalls: parseBool(getEnvVar('VITE_FEATURE_VIDEO_CALLS', 'true')),
        stories: parseBool(getEnvVar('VITE_FEATURE_STORIES', 'false')),
        circles: parseBool(getEnvVar('VITE_FEATURE_CIRCLES', 'false')),
    },

    analytics: {
        enabled: parseBool(getEnvVar('VITE_ANALYTICS_ENABLED', 'false')),
    },

    api: {
        baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:5001'),
    },

    logging: {
        level: (getEnvVar('VITE_LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error'),
    },
};

/**
 * Check if running in development
 */
export const isDevelopment = config.env === 'development';

/**
 * Check if running in staging
 */
export const isStaging = config.env === 'staging';

/**
 * Check if running in production
 */
export const isProduction = config.env === 'production';

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return config.features[feature];
}

/**
 * Log only if level is appropriate for environment
 */
export function log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(config.logging.level);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= currentLevel) {
        console[level](...args);
    }
}

export default config;
