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
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '745502376472-dqf1pus06s224bakb2i3sls86flgfjm5.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
