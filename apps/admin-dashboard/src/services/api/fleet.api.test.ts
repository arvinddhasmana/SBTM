import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fleetApi } from './fleet.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('fleetApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllVehicles', () => {
    it('should return all vehicles from API', async () => {
      const mockVehicles = [
        { id: 'v-1', plateNumber: 'ABC-123', capacity: 40 },
        { id: 'v-2', plateNumber: 'DEF-456', capacity: 30 },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockVehicles });

      const result = await fleetApi.getAllVehicles();

      expect(result).toEqual(mockVehicles);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/vehicles');
    });
  });

  describe('createVehicle', () => {
    it('should post new vehicle data', async () => {
      const newVehicle = { licensePlate: 'GHI-789', schoolId: 'school-1' };
      const mockResponse = { id: 'v-3', ...newVehicle, status: 'ACTIVE' as const };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await fleetApi.createVehicle(newVehicle);

      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/vehicles', newVehicle);
    });
  });

  describe('updateVehicle', () => {
    it('should patch vehicle data by id', async () => {
      const updateData = { status: 'MAINTENANCE' as const };
      const mockResponse = {
        id: 'v-1',
        schoolId: 'school-1',
        licensePlate: 'ABC-123',
        status: 'MAINTENANCE' as const,
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await fleetApi.updateVehicle('v-1', updateData);

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/vehicles/v-1', updateData);
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle by id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({});

      await fleetApi.deleteVehicle('v-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/vehicles/v-1');
    });
  });
});
