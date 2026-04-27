import * as SecureStore from 'expo-secure-store';

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
      await SecureStore.setItemAsync(TOKEN_KEY, token);
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
      return await SecureStore.getItemAsync(TOKEN_KEY);
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
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
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
      const userData = await SecureStore.getItemAsync(USER_KEY);
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
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
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
