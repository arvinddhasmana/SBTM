import { describe, it, expect, vi, beforeEach } from 'vitest';
import { presenceApi } from './presence.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('presenceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStudentsByRoute', () => {
    it('should return students for a route', async () => {
      const mockEvents = [
        {
          id: 'e1',
          studentId: 'stud-1',
          firstName: 'Alice',
          lastName: '',
          grade: '5',
          vehicleId: 'v1',
          routeId: 'route-1',
          eventType: 'BOARD',
          timestamp: '2026-01-01T10:00:00Z',
        },
        {
          id: 'e2',
          studentId: 'stud-2',
          firstName: 'Bob',
          lastName: '',
          grade: '5',
          vehicleId: 'v1',
          routeId: 'route-1',
          eventType: 'BOARD',
          timestamp: '2026-01-01T10:00:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { items: mockEvents, total: 2, page: 1, limit: 1000 },
      });

      const result = await presenceApi.getStudentsByRoute('route-1');

      expect(result).toHaveLength(2);
      expect(result[0].studentId).toBe('stud-1');
      expect(result[1].studentId).toBe('stud-2');
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/presence/events', {
        params: { limit: 1000, routeId: 'route-1' },
      });
    });
  });

  describe('getAllBoardedStudents', () => {
    it('should return all boarded students across routes', async () => {
      const mockEvents = [
        {
          id: 'e1',
          studentId: 'stud-1',
          firstName: 'Student',
          lastName: '1',
          grade: '5',
          vehicleId: 'v1',
          routeId: 'route-1',
          eventType: 'BOARD',
          timestamp: '2026-01-01T10:00:00Z',
        },
        {
          id: 'e2',
          studentId: 'stud-2',
          firstName: 'Student',
          lastName: '2',
          grade: '5',
          vehicleId: 'v1',
          routeId: 'route-1',
          eventType: 'ALIGHT',
          timestamp: '2026-01-01T10:00:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { items: mockEvents, total: 2, page: 1, limit: 1000 },
      });

      const result = await presenceApi.getAllBoardedStudents(['route-1', 'route-2']);

      expect(result).toHaveLength(1);
      expect(result[0].studentId).toBe('stud-1');
    });
  });
});
