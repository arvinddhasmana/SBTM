import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_REQUEST_TIMEOUT_MS } from '../config/constants';

const BASE_URL = (() => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to your .env file.');
  return url;
})();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_REQUEST_TIMEOUT_MS,
});

// Attach JWT to every outgoing request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses by clearing stale auth state
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid – clear stored token and notify app
      await SecureStore.deleteItemAsync('auth_token');
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export default api;
