import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snuggle.app',
  appName: 'Snuggle',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false, // We will handle updates manually in React
    },
  },
};

export default config;
