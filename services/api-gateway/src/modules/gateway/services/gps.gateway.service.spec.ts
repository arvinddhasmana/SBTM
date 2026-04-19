import { Test, TestingModule } from '@nestjs/testing';
import { GpsGatewayService } from './gps.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { Role } from '@sbtm/common';
import { DataSource } from 'typeorm';

describe('GpsGatewayService', () => {
  let service: GpsGatewayService;
  let httpClient: HttpClientService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'GPS_SERVICE_URL') return 'http://gps-service:3002';
      return defaultValue;
    }),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  const superAdminUser = {
    id: 'super-admin-1',
    role: Role.SUPER_ADMIN,
    childRouteIds: [],
    assignedRouteIds: [],
  };

  const adminUser = {
    id: 'admin-1',
    role: Role.ADMIN,
    childRouteIds: [],
    assignedRouteIds: [],
  };

  const parentUser = {
    id: 'parent-1',
    role: Role.PARENT,
    childRouteIds: ['route-123'],
    assignedRouteIds: [],
  };

  const driverUser = {
    id: 'driver-1',
    role: Role.DRIVER,
    childRouteIds: [],
    assignedRouteIds: ['route-123'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpsGatewayService,
        {
          provide: HttpClientService,
          useValue: mockHttpClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<GpsGatewayService>(GpsGatewayService);
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLiveLocation', () => {
    const mockResponse = {
      routeId: 'route-123',
      vehicleId: 'bus-456',
      lastUpdate: '2025-01-01T12:00:00Z',
      position: { lat: 45.42, lng: -75.69 },
      etaToNextStopMinutes: 5,
    };

    it('should allow admin to access any route', async () => {
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.getLiveLocation('route-123', adminUser);

      expect(result).toEqual(mockResponse);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://gps-service:3002/api/v1/routes/route-123/live-location',
      );
    });

    it('should allow super_admin to access any route', async () => {
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.getLiveLocation('route-123', superAdminUser);

      expect(result).toEqual(mockResponse);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://gps-service:3002/api/v1/routes/route-123/live-location',
      );
    });

    it('should allow parent to access their child route', async () => {
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.getLiveLocation('route-123', parentUser);

      expect(result).toEqual(mockResponse);
    });

    it('should deny parent access to other routes', async () => {
      await expect(
        service.getLiveLocation('route-999', parentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow driver to access assigned route', async () => {
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.getLiveLocation('route-123', driverUser);

      expect(result).toEqual(mockResponse);
    });

    it('should deny driver access to unassigned routes', async () => {
      await expect(
        service.getLiveLocation('route-999', driverUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns { active: false, routeId } when GPS service has no location data (404)', async () => {
      // Simulates the GPS tracking service returning 404 when the bus has not
      // started its run yet. The gateway must NOT re-throw this as a 404 to the
      // client — instead it returns HTTP 200 { active: false } to keep the
      // browser console clean.
      mockHttpClient.get.mockRejectedValue(new HttpException('Not Found', 404));
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getLiveLocation('route-123', adminUser);

      expect(result.active).toBe(false);
      expect(result.routeId).toBe('route-123');
    });

    it('enriches status as emergency for PENDING_CONFIRMATION PANIC_BUTTON alert', async () => {
      mockHttpClient.get.mockResolvedValue({ ...mockResponse });
      mockDataSource.query.mockResolvedValue([{ eventType: 'PANIC_BUTTON' }]);

      const result = await service.getLiveLocation('route-123', adminUser);

      expect(result.status).toBe('emergency');
    });

    it('enriches status as delay for PENDING_CONFIRMATION non-emergency alert', async () => {
      mockHttpClient.get.mockResolvedValue({ ...mockResponse });
      mockDataSource.query.mockResolvedValue([{ eventType: 'LATE_ARRIVAL' }]);

      const result = await service.getLiveLocation('route-123', adminUser);

      expect(result.status).toBe('delay');
    });

    it('enriches status as normal when no operational alerts exist', async () => {
      mockHttpClient.get.mockResolvedValue({ ...mockResponse });
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getLiveLocation('route-123', adminUser);

      expect(result.status).toBe('normal');
    });
  });

  describe('getLocationHistory', () => {
    it('should call GPS service with query params', async () => {
      mockHttpClient.get.mockResolvedValue([]);

      await service.getLocationHistory(
        'route-123',
        { from: '2025-01-01', to: '2025-01-02', granularity: '1min' },
        adminUser,
      );

      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('from=2025-01-01'),
      );
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('to=2025-01-02'),
      );
      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('granularity=1min'),
      );
    });
  });

  describe('getActiveRoutes', () => {
    const mockReferenceRoutes = [
      {
        id: 'ROUTE-AM',
        name: 'AM Route',
        vehicleId: 'BUS-01',
        driverId: 'd1',
        schedule: '{"startTime":"07:30"}',
        polyline: null,
        schoolId: 'school-1',
        schoolName: 'Greenfield Elementary',
      },
      {
        id: 'ROUTE-PM',
        name: 'PM Route',
        vehicleId: 'BUS-01',
        driverId: 'd1',
        schedule: '{"startTime":"15:00"}',
        polyline: null,
        schoolId: 'school-1',
        schoolName: 'Greenfield Elementary',
      },
    ];
    const mockStops: any[] = [];

    it('should return routes whose latest lifecycle event is not ROUTE_COMPLETED', async () => {
      mockDataSource.query
        .mockResolvedValueOnce(mockReferenceRoutes) // routes query
        .mockResolvedValueOnce([
          // lifecycle events query
          { routeId: 'ROUTE-AM', eventType: 'STOP_REACHED' },
          { routeId: 'ROUTE-PM', eventType: 'ROUTE_COMPLETED' },
        ])
        .mockResolvedValueOnce(mockStops); // stops query

      const result = await service.getActiveRoutes(superAdminUser);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ROUTE-AM');
    });

    it('should include schoolName in returned routes', async () => {
      mockDataSource.query
        .mockResolvedValueOnce(mockReferenceRoutes)
        .mockResolvedValueOnce([
          { routeId: 'ROUTE-AM', eventType: 'ROUTE_STARTED' },
        ])
        .mockResolvedValueOnce(mockStops);

      const result = await service.getActiveRoutes(superAdminUser);

      expect(result[0].schoolName).toBe('Greenfield Elementary');
    });

    it('should return empty array when no routes have been started', async () => {
      mockDataSource.query
        .mockResolvedValueOnce(mockReferenceRoutes)
        .mockResolvedValueOnce([
          // all completed
          { routeId: 'ROUTE-AM', eventType: 'ROUTE_COMPLETED' },
          { routeId: 'ROUTE-PM', eventType: 'ROUTE_COMPLETED' },
        ])
        .mockResolvedValueOnce(mockStops);

      const result = await service.getActiveRoutes(superAdminUser);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no lifecycle events exist', async () => {
      mockDataSource.query
        .mockResolvedValueOnce(mockReferenceRoutes)
        .mockResolvedValueOnce([]) // no lifecycle events
        .mockResolvedValueOnce(mockStops);

      const result = await service.getActiveRoutes(superAdminUser);

      expect(result).toHaveLength(0);
    });
  });
});
