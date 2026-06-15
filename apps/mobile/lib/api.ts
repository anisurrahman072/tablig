import axios from 'axios';
import Constants from 'expo-constants';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:3004/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Fire-and-forget ping to wake Render free-tier server from sleep. */
export function wakeupServer(): void {
  api.get('/wakeup', { timeout: 30000 }).catch(() => {});
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isNetworkError = !error.response;
    const message =
      error.response?.data?.message ||
      (isNetworkError
        ? 'নেটওয়ার্ক সমস্যা হয়েছে। ইন্টারনেট সংযোগ দেখুন।'
        : 'সার্ভারে সমস্যা হয়েছে');
    const err = new Error(message) as Error & { isNetworkError: boolean };
    err.isNetworkError = isNetworkError;
    return Promise.reject(err);
  }
);

export default api;
