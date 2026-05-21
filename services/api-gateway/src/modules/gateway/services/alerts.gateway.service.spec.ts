import { Test, TestingModule } from '@nestjs/testing';
import { AlertsGatewayService } from './alerts.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { RlsContextService } from '../../../common/services/rls-context.service';

describe('AlertsGatewayService', () => {
  let service: AlertsGatewayService;
  let httpClient: typeof mockHttpClient;
  let rlsQuery: jest.Mock;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'ALERTS_SERVICE_URL') return 'http://alerts-service:3003';
      throw new Error(`Config key ${key} not found`);
    }),
  };

  // v2 upstream alert shape (category/severity/scopeRef instead of v1 eventType/tier/routeId)
  const rawV2Alert = {
    id: 'alert-1',
    status: 'active',
    category: 'safety',
    scopeKind: 'route',
    scopeRef: 'route-123',
    vehicleId: 'bus-1',
    staId: 'school-1',
    startsAt: '2025-01-01T12:00:00Z',
    createdAt: '2025-01-01T11:59:00Z',
    severity: 'critical',
  };

  beforeEach(async () => {
    rlsQuery = jest.fn().mockResolvedValue([]);
    const mockRls = {
      runAsCurrent: jest
        .fn()
        .mockImplementation(async <T>(fn: (tx: unknown) => Promise<T>) =>
          fn({ query: rlsQuery } as unknown),
        ),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsGatewayService,
        { provide: HttpClientService, useValue: mockHttpClient },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RlsContextService, useValue: mockRls },
      ],
    }).compile();

    service = module.get<AlertsGatewayService>(AlertsGatewayService);
    httpClient = module.get<typeof mockHttpClient>(HttpClientService as any);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveAlerts', () => {
    it('maps v2 upstream response to v1 AlertDto (category→eventType, severity→tier)', async () => {
      mockHttpClient.get.mockResolvedValueOnce([rawV2Alert]);

      const result = await service.getActiveAlerts();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'alert-1',
        schoolId: 'school-1',
        routeId: 'route-123',
        vehicleId: 'bus-1',
        timestamp: '2025-01-01T12:00:00Z',
        eventType: 'PANIC_BUTTON',
        status: 'ACTIVE',
        tier: 'TIER_1',
      });
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/active',
        { params: undefined },
      );
    });

    it('passes schoolId as query param when provided', async () => {
      mockHttpClient.get.mockResolvedValueOnce([]);
      await service.getActiveAlerts('school-1');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/active',
        { params: { schoolId: 'school-1' } },
      );
    });
  });

  describe('getAlertById', () => {
    it('maps v2 upstream response to v1 AlertDto', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        id: 'alert-1',
        status: 'active',
        category: 'route_deviation',
        scopeKind: 'route',
        scopeRef: 'route-456',
        vehicleId: 'bus-2',
        severity: 'warning',
      });

      const result = await service.getAlertById('alert-1');

      expect(result).toMatchObject({
        id: 'alert-1',
        routeId: 'route-456',
        vehicleId: 'bus-2',
        eventType: 'ROUTE_DEVIATION',
        status: 'ACTIVE',
        tier: 'TIER_2',
      });
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/alert-1',
      );
    });
  });

  describe('getAlertsForRoute', () => {
    it('maps category to eventType when alert is active — the fix for the broken dashboard banner', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        alertActive: true,
        id: 'alert-1',
        status: 'active',
        category: 'safety',
        scopeKind: 'route',
        scopeRef: 'route-123',
        vehicleId: 'bus-1',
        message: 'Panic button pressed',
        routeName: 'Route 101',
      });

      const result = await service.getAlertsForRoute('route-123');

      expect(result.alertActive).toBe(true);
      expect(result.eventType).toBe('PANIC_BUTTON');
      expect(result.message).toBe('Panic button pressed');
      expect(result.routeName).toBe('Route 101');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/parent-view/route-123',
      );
    });

    it('returns { alertActive: false } when upstream reports no active alert', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ alertActive: false });
      const result = await service.getAlertsForRoute('route-123');
      expect(result).toEqual({
        alertActive: false,
        message: 'No active alert',
      });
    });

    it('returns { alertActive: false } when upstream returns null', async () => {
      mockHttpClient.get.mockResolvedValueOnce(null);
      const result = await service.getAlertsForRoute('route-123');
      expect(result).toEqual({
        alertActive: false,
        message: 'No active alert',
      });
    });
  });

  describe('createEmergencyEvent', () => {
    it('should create emergency event', async () => {
      const dto = {
        schoolId: 'school-123',
        vehicleId: 'bus-123',
        routeId: 'route-456',
        driverId: 'driver-789',
        timestamp: '2025-01-01T12:00:00Z',
        lat: 45.42,
        lng: -75.69,
        eventType: 'PANIC_BUTTON',
      };
      const mockResponse = { alertId: 'alert-new', status: 'received' };
      mockHttpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await service.createEmergencyEvent(dto);

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/emergency-events',
        dto,
      );
    });
  });

  describe('resolveAlert', () => {
    it('maps resolved upstream response to v1 AlertDto', async () => {
      mockHttpClient.patch.mockResolvedValueOnce({
        id: 'alert-1',
        status: 'resolved',
        category: 'safety',
        scopeRef: 'route-1',
        vehicleId: 'bus-1',
      });

      const body = {
        notes: 'Resolved on scene',
        actorUserId: 'admin-1',
        actorRole: 'SCHOOL_ADMIN',
      };
      const result = await service.resolveAlert('alert-1', body);

      expect(result).toMatchObject({
        id: 'alert-1',
        status: 'RESOLVED',
        eventType: 'PANIC_BUTTON',
      });
      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/alert-1/resolve',
        body,
      );
    });

    it('resolves with empty body when no params provided', async () => {
      mockHttpClient.patch.mockResolvedValueOnce({
        id: 'alert-1',
        status: 'resolved',
      });
      await service.resolveAlert('alert-1');
      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/alert-1/resolve',
        {},
      );
    });
  });

  describe('addStatusUpdate', () => {
    it('proxies patch body and returns raw upstream response', async () => {
      const mockResponse = { id: 'audit-1', eventType: 'STATUS_UPDATE' };
      mockHttpClient.patch.mockResolvedValueOnce(mockResponse);

      const body = {
        notes: 'Police arrived',
        actorUserId: 'admin-1',
        actorRole: 'SCHOOL_ADMIN',
      };
      const result = await service.addStatusUpdate('alert-1', body);

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/alert-1/status-update',
        body,
      );
    });
  });

  describe('getParentAlertHistory', () => {
    it('returns empty array when the guardian has no active ridership', async () => {
      rlsQuery.mockResolvedValueOnce([]);
      const result = await service.getParentAlertHistory('grd-1');
      expect(result).toEqual([]);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('resolves distinct route_ids from ridership and proxies to alerts service', async () => {
      rlsQuery.mockResolvedValueOnce([
        { route_id: 'R-OCSB-201' },
        { route_id: 'R-OCDSB-101' },
      ]);
      mockHttpClient.get.mockResolvedValueOnce([rawV2Alert]);

      const result = await service.getParentAlertHistory('grd-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'alert-1',
        eventType: 'PANIC_BUTTON',
      });
      expect(rlsQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = rlsQuery.mock.calls[0] as [string, unknown[]];
      expect(sql).toMatch(/FROM stx_student_guardians sg/);
      expect(sql).toMatch(/JOIN stx_ridership rd/);
      expect(sql).toMatch(/JOIN trips t/);
      expect(params[0]).toBe('grd-1');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/by-routes',
        { params: { routeIds: 'R-OCSB-201,R-OCDSB-101' } },
      );
    });
  });
});
