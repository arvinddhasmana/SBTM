import { RosterService } from './roster.service';

// Mock the API service
jest.mock('./api.service', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import api from './api.service';

const mockApi = api as jest.Mocked<typeof api>;

describe('RosterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRouteRoster', () => {
    it('maps an array response to Student objects', async () => {
      mockApi.get.mockResolvedValue({
        data: [
          { id: 'student-1', name: 'Test Student A', status: 'NOT_BOARDED' },
          { id: 'student-2', name: 'Test Student B', status: 'BOARDED' },
        ],
      });

      const result = await RosterService.getRouteRoster('route-abc');

      expect(mockApi.get).toHaveBeenCalledWith('/driver/me/routes/route-abc/students');
      expect(result.students).toHaveLength(2);
      expect(result.students[0]).toMatchObject({
        id: 'student-1',
        status: 'NOT_BOARDED',
        serverConfirmed: true,
        pendingSync: false,
      });
      expect(result.students[1].status).toBe('BOARDED');
      expect(result.direction).toBe('AM'); // default when not provided
    });

    it('maps wrapped { students: [] } response shape', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          students: [{ id: 'student-3', name: 'Test Student C', status: 'ALIGHTED' }],
          stops: [{ id: 'stop-1', stopName: 'Main St', sequence: 1, arrivalTime: '08:00' }],
          direction: 'PM',
        },
      });

      const result = await RosterService.getRouteRoster('route-xyz');

      expect(result.students).toHaveLength(1);
      expect(result.students[0].status).toBe('ALIGHTED');
      expect(result.stops).toHaveLength(1);
      expect(result.direction).toBe('PM');
    });

    it('returns empty students when students list is absent', async () => {
      mockApi.get.mockResolvedValue({ data: { students: [] } });

      const result = await RosterService.getRouteRoster('route-empty');

      expect(result.students).toHaveLength(0);
      expect(result.stops).toHaveLength(0);
    });

    it('normalises UNKNOWN status to NOT_BOARDED', async () => {
      mockApi.get.mockResolvedValue({
        data: [{ id: 'student-5', name: 'Test Student E', status: 'UNKNOWN' }],
      });

      const result = await RosterService.getRouteRoster('route-fresh');

      expect(result.students[0].status).toBe('NOT_BOARDED');
    });

    it('uses studentId alias if id field is missing', async () => {
      mockApi.get.mockResolvedValue({
        data: [{ studentId: 'student-alias', name: 'Test Student F', status: 'BOARDED' }],
      });

      const result = await RosterService.getRouteRoster('route-alias');

      expect(result.students[0].id).toBe('student-alias');
    });

    it('propagates API errors to the caller', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await expect(RosterService.getRouteRoster('route-fail')).rejects.toThrow('Network error');
    });

    it('preserves avatarUrl from API response', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          students: [
            {
              id: 'student-photo',
              name: 'Jane Doe',
              status: 'NOT_BOARDED',
              avatarUrl: 'https://example.com/photo.jpg',
            },
          ],
          stops: [],
          direction: 'AM',
        },
      });

      const result = await RosterService.getRouteRoster('route-photos');

      expect(result.students[0].avatarUrl).toBe('https://example.com/photo.jpg');
    });
  });
});
