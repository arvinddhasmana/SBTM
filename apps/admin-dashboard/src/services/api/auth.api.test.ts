import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from './auth.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  AUTH_TOKEN_KEY: 'auth_token',
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should return user on successful login', async () => {
      const mockResponse = {
        data: {
          user: {
            id: 'admin-001',
            email: 'admin@example.com',
            role: 'SUPER_ADMIN',
            firstName: 'Admin',
            lastName: 'User',
            anchorKind: 'super',
            anchorId: null,
            preferredLanguage: 'en',
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await authApi.login('admin@example.com', 'password');

      expect(result).toEqual({
        user: {
          id: 'admin-001',
          email: 'admin@example.com',
          role: 'SUPER_ADMIN',
          name: 'Admin User',
          anchorKind: 'super',
          anchorId: null,
          preferredLanguage: 'en',
        },
      });
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'admin@example.com',
        password: 'password',
      });
    });
  });

  describe('logout', () => {
    it('should call logout endpoint', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await authApi.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/logout');
    });
  });

  describe('me', () => {
    it('should return current user info', async () => {
      const mockResponse = {
        data: {
          id: 'admin-001',
          email: 'admin@example.com',
          role: 'BOARD_ADMIN',
          firstName: 'Admin',
          lastName: 'User',
          anchorKind: 'board',
          anchorId: 'BRD-001',
          preferredLanguage: 'en',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await authApi.me();

      expect(result).toEqual({
        user: {
          id: 'admin-001',
          email: 'admin@example.com',
          role: 'BOARD_ADMIN',
          name: 'Admin User',
          anchorKind: 'board',
          anchorId: 'BRD-001',
          preferredLanguage: 'en',
        },
      });
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/auth/me');
    });
  });
});
