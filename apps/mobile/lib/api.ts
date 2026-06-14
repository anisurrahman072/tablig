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
    const message =
      error.response?.data?.message ||
      (error.response
        ? 'সার্ভারে সমস্যা হয়েছে'
        : 'সার্ভারে সংযোগ করা যায়নি। সার্ভার চালু আছে কিনা এবং ফোন একই Wi‑Fi-তে আছে কিনা দেখুন।');
    return Promise.reject(new Error(message));
  }
);

export default api;
