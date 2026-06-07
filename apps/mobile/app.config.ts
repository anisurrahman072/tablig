import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'তাবলিগ',
  slug: 'tablig',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'tablig',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#E8F8F5',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E8F8F5',
    },
  },
  plugins: ['expo-router', 'expo-font', 'expo-secure-store', '@react-native-community/datetimepicker'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3004/api',
  },
});
