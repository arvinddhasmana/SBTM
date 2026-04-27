import { AuthService } from './AuthService';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setToken', () => {
    it('should store token in secure store', async () => {
      const token = 'test-jwt-token';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await AuthService.setToken(token);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', token);
    });
  });

  describe('getToken', () => {
    it('should retrieve token from secure store', async () => {
      const token = 'test-jwt-token';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(token);

      const result = await AuthService.getToken();

      expect(result).toBe(token);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.getToken();

      expect(result).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should store user data in secure store', async () => {
      const user = { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await AuthService.setUser(user);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        JSON.stringify(user)
      );
    });
  });

  describe('getUser', () => {
    it('should retrieve and parse user data from secure store', async () => {
      const user = { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(user));

      const result = await AuthService.getUser();

      expect(result).toEqual(user);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('user_data');
    });

    it('should return null when no user data exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.getUser();

      expect(result).toBeNull();
    });

    it('should return null when user data is invalid JSON', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('invalid-json');

      const result = await AuthService.getUser();

      expect(result).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should delete both token and user data', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await AuthService.clearAuth();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('restoreSession', () => {
    it('should restore user data when token exists', async () => {
      const user = { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      const token = 'test-jwt-token';

      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(token) // getToken
        .mockResolvedValueOnce(JSON.stringify(user)); // getUser

      const result = await AuthService.restoreSession();

      expect(result).toEqual(user);
    });

    it('should return null when no token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.restoreSession();

      expect(result).toBeNull();
    });

    it('should return null when token exists but no user data', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('test-token')
        .mockResolvedValueOnce(null);

      const result = await AuthService.restoreSession();

      expect(result).toBeNull();
    });
  });

  describe('setOnUnauthorized', () => {
    it('should set the unauthorized callback', () => {
      const callback = jest.fn();

      AuthService.setOnUnauthorized(callback);

      // Callback should be stored but not called yet
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('handleUnauthorized', () => {
    it('should call the registered callback', () => {
      const callback = jest.fn();
      AuthService.setOnUnauthorized(callback);

      AuthService.handleUnauthorized();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not throw when no callback is registered', () => {
      AuthService.setOnUnauthorized(null);

      expect(() => AuthService.handleUnauthorized()).not.toThrow();
    });
  });
});
