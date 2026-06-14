import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'তাবলিগ',
  slug: 'tablig',
  version: '1.0.0',
  icon: './assets/logo.png',
  orientation: 'portrait',
  scheme: 'tablig',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/logo.png',
    resizeMode: 'contain',
    backgroundColor: '#E8F8F5',
  },
  ios: {
    supportsTablet: true,
    icon: './assets/logo.png',
  },
  android: {
    package: 'com.anisur072.tablig',
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      foregroundImage: './assets/logo.png',
      backgroundColor: '#E8F8F5',
    },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        image: './assets/logo.png',
        resizeMode: 'contain',
        backgroundColor: '#E8F8F5',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3004/api',
  },
});
