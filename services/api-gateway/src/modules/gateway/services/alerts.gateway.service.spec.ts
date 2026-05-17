import { Test, TestingModule } from '@nestjs/testing';
import { AlertsGatewayService } from './alerts.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { RlsContextService } from '../../../common/services/rls-context.service';

describe('AlertsGatewayService', () => {
  let service: AlertsGatewayService;
  let httpClient: HttpClientService;
  let rlsQuery: jest.Mock;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'ALERTS_SERVICE_URL') return 'http://alerts-service:3003';
      return defaultValue;
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'ALERTS_SERVICE_URL') return 'http://alerts-service:3003';
      throw new Error(`Config key ${key} not found`);
    }),
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
        {
          provide: HttpClientService,
          useValue: mockHttpClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RlsContextService,
          useValue: mockRls,
        },
      ],
    }).compile();

    service = module.get<AlertsGatewayService>(AlertsGatewayService);
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts from alerts service', async () => {
      const mockAlerts = [
        { id: 'alert-1', status: 'ACTIVE', routeId: 'route-123' },
      ];
      mockHttpClient.get.mockResolvedValue(mockAlerts);

      const result = await service.getActiveAlerts();

      expect(result).toEqual(mockAlerts);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/active',
        { params: undefined },
      );
    });
  });

  describe('getAlertById', () => {
    it('should return alert by id', async () => {
      const mockAlert = { id: 'alert-1', status: 'ACTIVE' };
      mockHttpClient.get.mockResolvedValue(mockAlert);

      const result = await service.getAlertById('alert-1');

      expect(result).toEqual(mockAlert);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/alert-1',
      );
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
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.createEmergencyEvent(dto);

      expect(result).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/emergency-events',
        dto,
      );
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert with body', async () => {
      const mockResponse = { id: 'alert-1', status: 'RESOLVED' };
      mockHttpClient.patch.mockResolvedValue(mockResponse);

      const body = {
        notes: 'Resolved on scene',
        actorUserId: 'admin-1',
        actorRole: 'SCHOOL_ADMIN',
      };
      const result = await service.resolveAlert('alert-1', body);

      expect(result).toEqual(mockResponse);
      expect(httpClient.patch).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/alert-1/resolve',
        body,
      );
    });

    it('should resolve alert with empty body when no params', async () => {
      const mockResponse = { id: 'alert-1', status: 'RESOLVED' };
      mockHttpClient.patch.mockResolvedValue(mockResponse);

      const result = await service.resolveAlert('alert-1');

      expect(result).toEqual(mockResponse);
      expect(httpClient.patch).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/alert-1/resolve',
        {},
      );
    });
  });

  describe('addStatusUpdate', () => {
    it('should add status update to alert', async () => {
      const mockResponse = { id: 'audit-1', eventType: 'STATUS_UPDATE' };
      mockHttpClient.patch.mockResolvedValue(mockResponse);

      const body = {
        notes: 'Police arrived',
        actorUserId: 'admin-1',
        actorRole: 'SCHOOL_ADMIN',
      };
      const result = await service.addStatusUpdate('alert-1', body);

      expect(result).toEqual(mockResponse);
      expect(httpClient.patch).toHaveBeenCalledWith(
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
      expect(httpClient.get).not.toHaveBeenCalled();
    });

    it('resolves distinct route_ids from ridership and proxies to alerts service', async () => {
      rlsQuery.mockResolvedValueOnce([
        { route_id: 'R-OCSB-201' },
        { route_id: 'R-OCDSB-101' },
      ]);
      const mockAlerts = [{ id: 'a-1', routeId: 'R-OCSB-201' }];
      mockHttpClient.get.mockResolvedValueOnce(mockAlerts);

      const result = await service.getParentAlertHistory('grd-1');

      expect(result).toEqual(mockAlerts);
      expect(rlsQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = rlsQuery.mock.calls[0] as [string, unknown[]];
      expect(sql).toMatch(/FROM stx_student_guardians sg/);
      expect(sql).toMatch(/JOIN stx_ridership rd/);
      expect(sql).toMatch(/JOIN trips t/);
      expect(params[0]).toBe('grd-1');
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://alerts-service:3003/api/v1/alerts/by-routes',
        { params: { routeIds: 'R-OCSB-201,R-OCDSB-101' } },
      );
    });
  });
});
