import axios from 'axios';
import { tokenStorage } from './token-storage';
import { API_REQUEST_TIMEOUT_MS } from '../config/constants';

const BASE_URL = (() => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to your .env file.');
  return url;
})();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_REQUEST_TIMEOUT_MS,
  // ngrok free tier serves an HTML interstitial to browser-like UAs without this
  // header, which surfaces in axios as "Network Error" because the response
  // isn't JSON. Harmless when not using ngrok.
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

// Attach JWT to every outgoing request
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
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

let isClearingAuth = false;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isClearingAuth) {
      isClearingAuth = true;
      // Token expired or invalid – clear stored token and notify app
      await tokenStorage.remove();
      onUnauthorized?.();
      setTimeout(() => {
        isClearingAuth = false;
      }, 2000);
    }
    return Promise.reject(error);
  },
);

export default api;
