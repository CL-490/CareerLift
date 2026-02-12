import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.careerlift.app',
  appName: 'CareerLift',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
