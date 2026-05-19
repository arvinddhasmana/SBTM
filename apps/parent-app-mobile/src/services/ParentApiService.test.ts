import { ParentApiService } from './ParentApiService';
import { ApiService } from './ApiService';

jest.mock('./ApiService');
jest.mock('./AuthService');

describe('ParentApiService', () => {
  const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login and return user and token', async () => {
      const mockResponse = {
        user: { id: '1', email: 'parent@test.com', firstName: 'Parent', lastName: 'User' },
        accessToken: 'test-jwt-token',
      };
      mockApiService.post.mockResolvedValue(mockResponse);

      const result = await ParentApiService.login('parent@test.com', 'password123');

      expect(mockApiService.post).toHaveBeenCalledWith('/auth/login', {
        email: 'parent@test.com',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getChildren', () => {
    it('should fetch and normalize children list', async () => {
      const serverDto = [
        { id: '1', name: 'John Doe', status: 'at_home', schoolName: 'Test School' },
        { id: '2', name: 'Jane Doe', status: 'on_bus', amRouteId: 'route-am' },
      ];
      mockApiService.get.mockResolvedValue(serverDto);

      const result = await ParentApiService.getChildren();

      expect(mockApiService.get).toHaveBeenCalledWith('/parent/children');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        status: 'at_home',
      });
      expect(result[1]).toMatchObject({
        id: '2',
        firstName: 'Jane',
        lastName: 'Doe',
        status: 'on_bus',
        amRouteId: 'route-am',
      });
    });

    it('should return empty array for non-array response', async () => {
      mockApiService.get.mockResolvedValue(null);

      const result = await ParentApiService.getChildren();

      expect(result).toEqual([]);
    });
  });

  describe('getLiveLocation', () => {
    it('should fetch live bus location and normalize', async () => {
      const serverDto = {
        vehicleId: 'v-1',
        routeId: 'route-123',
        position: { lat: 45.4215, lng: -75.6972 },
        headingDeg: 90,
        speedKph: 30,
        lastUpdate: '2026-04-27T12:00:00Z',
        etaToNextStopMinutes: 5,
        active: true,
      };
      mockApiService.get.mockResolvedValue(serverDto);

      const result = await ParentApiService.getLiveLocation('route-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/routes/route-123/live-location');
      expect(result).toMatchObject({
        lat: 45.4215,
        lng: -75.6972,
        vehicleId: 'v-1',
        routeId: 'route-123',
      });
    });

    it('should return null when active is false', async () => {
      mockApiService.get.mockResolvedValue({ active: false });

      const result = await ParentApiService.getLiveLocation('route-123');

      expect(result).toBeNull();
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
        path: [
          [45.42, -75.69],
          [45.43, -75.7],
        ],
      };
      mockApiService.get.mockResolvedValue(mockRoute);

      const result = await ParentApiService.getRouteDetails('route-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/routes/reference/route-123');
      expect(result.id).toEqual('route-123');
      expect(result.stops).toHaveLength(2);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return empty array when no route IDs provided', async () => {
      const result = await ParentApiService.getActiveAlerts([]);

      expect(mockApiService.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should fetch active alerts per route using /alerts/parent-view/:routeId', async () => {
      const routeIds = ['route-1'];
      const serverAlertView = {
        alertActive: true,
        id: 'alert-1',
        routeId: 'route-1',
        eventType: 'LATE_ARRIVAL',
        vehicleId: 'v-1',
        status: 'ACTIVE',
        severity: 'WARNING',
        description: 'Bus is running late',
        createdAt: '2026-04-27T12:00:00Z',
      };
      mockApiService.get.mockResolvedValue(serverAlertView);

      const result = await ParentApiService.getActiveAlerts(routeIds);

      expect(mockApiService.get).toHaveBeenCalledWith('/alerts/parent-view/route-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'alert-1',
        routeId: 'route-1',
        eventType: 'LATE_ARRIVAL',
      });
    });

    it('should skip routes with alertActive false', async () => {
      mockApiService.get.mockResolvedValue({ alertActive: false });

      const result = await ParentApiService.getActiveAlerts(['route-1']);

      expect(result).toEqual([]);
    });
  });

  describe('getAlertHistory', () => {
    it('should fetch alert history', async () => {
      const mockHistory = [
        { id: 'alert-1', routeId: 'route-1', eventType: 'PANIC_BUTTON', status: 'RESOLVED' },
      ];
      mockApiService.get.mockResolvedValue(mockHistory);

      const result = await ParentApiService.getAlertHistory();

      expect(mockApiService.get).toHaveBeenCalledWith('/alerts/parent-history');
      expect(result).toEqual(mockHistory);
    });

    it('should return empty array for non-array response', async () => {
      mockApiService.get.mockResolvedValue(null);

      const result = await ParentApiService.getAlertHistory();

      expect(result).toEqual([]);
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
  });

  describe('getNotificationPreferences', () => {
    it('should fetch notification preferences and inflate flat server rows', async () => {
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
      mockApiService.post.mockResolvedValue({ success: true });

      await expect(ParentApiService.registerDeviceToken(token, platform)).resolves.not.toThrow();

      expect(mockApiService.post).toHaveBeenCalledWith('/parent/device-tokens', {
        token,
        platform,
      });
    });
  });

  describe('unregisterDeviceToken', () => {
    it('should unregister device token', async () => {
      const token = 'expo-push-token';
      mockApiService.delete.mockResolvedValue({ success: true });

      await expect(ParentApiService.unregisterDeviceToken(token)).resolves.not.toThrow();

      expect(mockApiService.delete).toHaveBeenCalledWith(`/parent/device-tokens/${token}`);
    });
  });
});
