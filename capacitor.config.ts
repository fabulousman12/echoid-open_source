import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swipe',
  appName: 'Echoid',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    CapacitorSQLite: {
      android: {
        debug: true,
        location: 'default'
      }
    },
    PushNotifications: {
      presentationOptions: [
        'badge',
        'sound',
        'alert'
      ]
    },
    FileChooser: {},
    Media: {
      androidGalleryMode: true
    },
    UnityAds: {
      gameId: 'xxxxx',
      testMode: true
    },
    CapacitorUpdater: {
      appId: 'com.swipe',
      autoUpdate: true,
      appReadyTimeout: 10000,
      responseTimeout: 20,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      resetWhenUpdate: true,
      keepUrlPathAfterReload: true,
      version: '0.0.0'
    }
    ,    LiveUpdates: {
      appId: 'xxxxx',

      // default fallback (runtime override will replace this)
      channel: 'Production',

      // auto sync behavior
      autoUpdateMethod: 'background',

      // how many bundles to keep
      maxVersions: 2
    },
  }
};

export default config;

