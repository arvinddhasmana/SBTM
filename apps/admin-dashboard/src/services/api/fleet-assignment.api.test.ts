import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fleetAssignmentApi } from './fleet-assignment.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('fleetAssignmentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return fleet assignments from API', async () => {
      const mockAssignments = [
        { id: 'fa-1', routeId: 'r-1', vehicleId: 'v-1', status: 'PROPOSED' },
        { id: 'fa-2', routeId: 'r-2', vehicleId: 'v-2', status: 'ACCEPTED' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAssignments });

      const result = await fleetAssignmentApi.list();

      expect(result).toEqual(mockAssignments);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/fleet-assignments');
    });
  });

  describe('propose', () => {
    it('should post a new fleet assignment proposal', async () => {
      const dto = {
        schoolId: 'school-1',
        routeId: 'route-1',
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        effectiveDate: '2026-05-01',
        notes: 'New assignment',
      };
      const mockResponse = { id: 'fa-3', ...dto, status: 'PROPOSED' };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await fleetAssignmentApi.propose(dto);

      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/fleet-assignments', dto);
    });
  });

  describe('accept', () => {
    it('should patch fleet assignment to accept', async () => {
      const mockResponse = { id: 'fa-1', status: 'ACCEPTED' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await fleetAssignmentApi.accept('fa-1');

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/fleet-assignments/fa-1/accept');
    });
  });

  describe('reject', () => {
    it('should patch fleet assignment to reject with notes', async () => {
      const mockResponse = { id: 'fa-1', status: 'REJECTED' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await fleetAssignmentApi.reject('fa-1', 'Not suitable');

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/fleet-assignments/fa-1/reject', {
        notes: 'Not suitable',
      });
    });

    it('should patch fleet assignment to reject without notes', async () => {
      const mockResponse = { id: 'fa-1', status: 'REJECTED' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await fleetAssignmentApi.reject('fa-1');

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/fleet-assignments/fa-1/reject', {
        notes: undefined,
      });
    });
  });
});
