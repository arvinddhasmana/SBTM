import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Web fallback: expo-secure-store ships a no-op web stub, so on web we
// transparently route reads/writes through localStorage. This keeps the
// rest of AuthService unchanged on native.
const webStore = {
  setItemAsync: async (key: string, value: string) => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem(key, value);
    }
  },
  getItemAsync: async (key: string): Promise<string | null> => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage.getItem(key);
    }
    return null;
  },
  deleteItemAsync: async (key: string) => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.removeItem(key);
    }
  },
};

const store: {
  setItemAsync: (key: string, value: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  deleteItemAsync: (key: string) => Promise<void>;
} =
  Platform.OS === 'web' || typeof (SecureStore as any).setItemAsync !== 'function'
    ? webStore
    : (SecureStore as any);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export class AuthService {
  private static onUnauthorizedCallback: (() => void) | null = null;

  /**
   * Register a callback to be invoked when a 401 response is received
   */
  static setOnUnauthorized(callback: () => void) {
    AuthService.onUnauthorizedCallback = callback;
  }

  /**
   * Invoke the unauthorized callback (called by ApiService)
   */
  static handleUnauthorized() {
    if (AuthService.onUnauthorizedCallback) {
      AuthService.onUnauthorizedCallback();
    }
  }

  /**
   * Store authentication token securely
   */
  static async setToken(token: string): Promise<void> {
    try {
      await store.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Retrieve stored authentication token
   */
  static async getToken(): Promise<string | null> {
    try {
      return await store.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Store user data securely
   */
  static async setUser(user: any): Promise<void> {
    try {
      await store.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  /**
   * Retrieve stored user data
   */
  static async getUser(): Promise<any | null> {
    try {
      const userData = await store.getItemAsync(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  }

  /**
   * Clear all stored authentication data
   */
  static async clearAuth(): Promise<void> {
    try {
      await store.deleteItemAsync(TOKEN_KEY);
      await store.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await AuthService.getToken();
    return !!token;
  }

  /**
   * Restore session from stored credentials
   * Returns user data if session is valid, null otherwise
   */
  static async restoreSession(): Promise<any | null> {
    try {
      const token = await AuthService.getToken();
      const user = await AuthService.getUser();

      if (token && user) {
        return user;
      }

      return null;
    } catch (error) {
      console.error('Error restoring session:', error);
      return null;
    }
  }

  /**
   * Logout - clear all auth data
   */
  static async logout(): Promise<void> {
    await AuthService.clearAuth();
  }
}
