import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.notbahcesi.app',
  appName: 'Not Bahçesi',
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
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#F6F3EE' // Uygulamanızın arka plan rengi (var(--paper))
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F6F3EE',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    }
  }
};

export default config;
