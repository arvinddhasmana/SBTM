import { Test, TestingModule } from '@nestjs/testing';
import { GpsGatewayService } from './gps.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
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
});
