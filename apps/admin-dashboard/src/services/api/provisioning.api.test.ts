import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provisioningApi } from './provisioning.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('provisioningApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inviteUser', () => {
    it('should post invite payload and return response', async () => {
      const payload = {
        email: 'driver@example.com',
        role: 'DRIVER' as const,
        schoolId: 'school-1',
      };
      const mockResponse = {
        message: 'Invitation sent',
        invitationUrl: 'https://app.example.com/invite/abc123',
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await provisioningApi.inviteUser(payload);

      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/provisioning/invite', payload);
    });
  });

  describe('listUsers', () => {
    it('should return provisioned users from API', async () => {
      const mockUsers = [
        { id: 'u-1', email: 'admin@example.com', role: 'OSTA_ADMIN', isActive: true },
        { id: 'u-2', email: 'driver@example.com', role: 'DRIVER', isActive: true },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUsers });

      const result = await provisioningApi.listUsers();

      expect(result).toEqual(mockUsers);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/provisioning/users');
    });
  });

  describe('deactivateUser', () => {
    it('should patch user to deactivate', async () => {
      const mockResponse = { message: 'User deactivated' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await provisioningApi.deactivateUser('u-2');

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/provisioning/users/u-2/deactivate');
    });
  });

  describe('reactivateUser', () => {
    it('should patch user to reactivate', async () => {
      const mockResponse = { message: 'User reactivated' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await provisioningApi.reactivateUser('u-2');

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/provisioning/users/u-2/reactivate');
    });
  });
});
