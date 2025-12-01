import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.notbahcesi.app',
  appName: 'Not Bahcesi',
  webDir: 'out',
  server: {
    url: 'https://mindgarden-neon.vercel.app/',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
