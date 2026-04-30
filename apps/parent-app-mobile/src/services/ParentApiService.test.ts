import { ParentApiService } from './ParentApiService';
import { ApiService } from './ApiService';

jest.mock('./ApiService');

describe('ParentApiService', () => {
  const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login and return user and token', async () => {
      const mockResponse = {
        user: { id: '1', email: 'parent@test.com', firstName: 'Parent', lastName: 'User' },
        token: 'test-jwt-token',
      };
      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await ParentApiService.login('parent@test.com', 'password123');

      expect(mockApiService.post).toHaveBeenCalledWith('/parent/auth/login', {
        email: 'parent@test.com',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getChildren', () => {
    it('should fetch children list', async () => {
      const mockChildren = [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'at_home' },
        { id: '2', firstName: 'Jane', lastName: 'Doe', status: 'on_bus' },
      ];
      mockApiService.get.mockResolvedValue(mockChildren);

      const result = await ParentApiService.getChildren();

      expect(mockApiService.get).toHaveBeenCalledWith('/parent/children');
      expect(result).toEqual(mockChildren);
    });
  });

  describe('getLiveLocation', () => {
    it('should fetch live bus location', async () => {
      const mockLocation = {
        lat: 45.4215,
        lng: -75.6972,
        heading: 90,
        speed: 30,
        timestamp: '2026-04-27T12:00:00Z',
      };
      mockApiService.get.mockResolvedValue(mockLocation);

      const result = await ParentApiService.getLiveLocation('route-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/routes/route-123/live-location');
      expect(result).toEqual(mockLocation);
    });

    it('should return null when live location not found (404)', async () => {
      const error: any = new Error('Not Found');
      error.statusCode = 404;
      mockApiService.get.mockRejectedValue(error);

      const result = await ParentApiService.getLiveLocation('route-123');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const error: any = new Error('Server Error');
      error.statusCode = 500;
      mockApiService.get.mockRejectedValue(error);

      await expect(ParentApiService.getLiveLocation('route-123')).rejects.toThrow('Server Error');
    });
  });

  describe('getRouteDetails', () => {
    it('should fetch route details from /routes/reference/:id', async () => {
      const mockRoute = {
        id: 'route-123',
        name: 'Route 101',
        stops: [
          { id: 'stop-1', name: 'Stop 1', lat: 45.42, lng: -75.69 },
          { id: 'stop-2', name: 'Stop 2', lat: 45.43, lng: -75.7 },
        ],
        polyline: 'encoded-polyline-string',
      };
      mockApiService.get.mockResolvedValue(mockRoute);

      const result = await ParentApiService.getRouteDetails('route-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/routes/reference/route-123');
      expect(result.id).toEqual('route-123');
      expect(result.stops).toHaveLength(2);
    });
  });

  describe('getActiveAlerts', () => {
    it('should fetch active alerts for given routes', async () => {
      const routeIds = ['route-1', 'route-2'];
      const mockAlerts = [
        {
          id: 'alert-1',
          routeId: 'route-1',
          eventType: 'LATE_ARRIVAL',
          description: 'Bus is running late',
          status: 'ACTIVE',
        },
      ];
      mockApiService.get.mockResolvedValue(mockAlerts);

      const result = await ParentApiService.getActiveAlerts(routeIds);

      expect(mockApiService.get).toHaveBeenCalledWith('/parent/alerts', {
        params: { routeIds: routeIds.join(',') },
      });
      expect(result).toEqual(mockAlerts);
    });

    it('should return empty array when no route IDs provided', async () => {
      const result = await ParentApiService.getActiveAlerts([]);

      expect(mockApiService.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getAlertHistory', () => {
    it('should fetch alert history', async () => {
      const mockHistory = [
        {
          id: 'alert-1',
          routeId: 'route-1',
          eventType: 'PANIC_BUTTON',
          description: 'Emergency button pressed',
          status: 'RESOLVED',
          timestamp: '2026-04-27T11:00:00Z',
        },
      ];
      mockApiService.get.mockResolvedValue(mockHistory);

      const result = await ParentApiService.getAlertHistory();

      expect(mockApiService.get).toHaveBeenCalledWith('/parent/alerts/history');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('reportAbsence', () => {
    it('should report student absence', async () => {
      const absenceReport = {
        studentId: 'student-123',
        tripDate: '2026-04-28',
        routeType: 'AM' as const,
        notes: 'Sick day',
      };
      const mockResponse = { success: true, id: 'absence-1' };
      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await ParentApiService.reportAbsence(absenceReport);

      expect(mockApiService.post).toHaveBeenCalledWith('/absences', absenceReport);
      expect(result).toEqual(mockResponse);
    });

    it('should report absence without notes', async () => {
      const absenceReport = {
        studentId: 'student-123',
        tripDate: '2026-04-28',
        routeType: 'BOTH' as const,
      };
      const mockResponse = { success: true, id: 'absence-2' };
      mockApiService.post.mockResolvedValue(mockResponse);

      await ParentApiService.reportAbsence(absenceReport);

      expect(mockApiService.post).toHaveBeenCalledWith('/absences', absenceReport);
    });
  });

  describe('getNotificationPreferences', () => {
    it('should fetch notification preferences and inflate flat server rows', async () => {
      // Server returns a flat list of rows
      const serverRows = [
        { eventType: 'EMERGENCY_ALERT', channel: 'PUSH', enabled: true },
        { eventType: 'EMERGENCY_ALERT', channel: 'EMAIL', enabled: true },
        { eventType: 'LATE_ARRIVAL', channel: 'PUSH', enabled: true },
      ];
      mockApiService.get.mockResolvedValue(serverRows);

      const result = await ParentApiService.getNotificationPreferences();

      expect(mockApiService.get).toHaveBeenCalledWith('/notification-preferences');
      expect(result.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'EMERGENCY_ALERT',
            channels: expect.arrayContaining(['PUSH', 'EMAIL']),
            enabled: true,
          }),
          expect.objectContaining({
            eventType: 'LATE_ARRIVAL',
            channels: ['PUSH'],
            enabled: true,
          }),
        ]),
      );
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should flatten preferences and PUT to /notification-preferences', async () => {
      const preferences = {
        userId: 'user-1',
        events: [
          {
            eventType: 'EMERGENCY_ALERT' as const,
            channels: ['PUSH' as const, 'EMAIL' as const],
            enabled: true,
          },
        ],
      };
      mockApiService.put.mockResolvedValue(undefined);

      await ParentApiService.updateNotificationPreferences(preferences);

      expect(mockApiService.put).toHaveBeenCalledWith('/notification-preferences', {
        preferences: [
          { eventType: 'EMERGENCY_ALERT', channel: 'PUSH', enabled: true },
          { eventType: 'EMERGENCY_ALERT', channel: 'EMAIL', enabled: true },
        ],
      });
    });
  });

  describe('registerDeviceToken', () => {
    it('should register device token for push notifications', async () => {
      const token = 'expo-push-token';
      const platform = 'ios';
      const mockResponse = { success: true };
      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await ParentApiService.registerDeviceToken(token, platform);

      expect(mockApiService.post).toHaveBeenCalledWith('/parent/device-tokens', {
        token,
        platform,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('unregisterDeviceToken', () => {
    it('should unregister device token', async () => {
      const token = 'expo-push-token';
      const mockResponse = { success: true };
      mockApiService.delete.mockResolvedValue(mockResponse);

      const result = await ParentApiService.unregisterDeviceToken(token);

      expect(mockApiService.delete).toHaveBeenCalledWith(`/parent/device-tokens/${token}`);
      expect(result).toEqual(mockResponse);
    });
  });
});
