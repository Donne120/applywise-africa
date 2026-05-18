import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wrapper for ApplyWise Africa.
 *
 * This file is dormant until the user opts in to the native build:
 *   npm install --save-dev @capacitor/cli
 *   npm install @capacitor/core @capacitor/android
 *   npm run cap:init        (one-time)
 *   npm run cap:build       (builds web + syncs to Android)
 *   npm run cap:open        (opens Android Studio)
 *
 * The PWA continues to work without any of this. Adding the native
 * shell just unlocks Play Store distribution.
 */
const config: CapacitorConfig = {
  appId: 'com.applywise.africa',
  appName: 'ApplyWise',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFF8F5',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FFF8F5',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#E8A0A8',
    },
  },
};

export default config;
