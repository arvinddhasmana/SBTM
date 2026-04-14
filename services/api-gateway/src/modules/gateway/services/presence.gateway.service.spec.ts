import { Test, TestingModule } from '@nestjs/testing';
import { PresenceGatewayService } from './presence.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';

describe('PresenceGatewayService', () => {
  let service: PresenceGatewayService;
  let httpClient: HttpClientService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'PRESENCE_SERVICE_URL') return 'http://presence-service:3004';
      return defaultValue;
    }),
  };

  const adminUser = { id: 'admin-1', schoolId: 'school-1' };
  const userNoSchool = { id: 'user-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceGatewayService,
        {
          provide: HttpClientService,
          useValue: mockHttpClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PresenceGatewayService>(PresenceGatewayService);
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should call presence service with schoolId query param', async () => {
      const mockStats = { total: 100, boarded: 42 };
      mockHttpClient.get.mockResolvedValue(mockStats);

      const result = await service.getStats(adminUser);

      expect(result).toEqual(mockStats);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://presence-service:3004/api/v1/presence/stats?schoolId=school-1',
      );
    });

    it('should omit schoolId when user has none', async () => {
      mockHttpClient.get.mockResolvedValue({});

      await service.getStats(userNoSchool);

      expect(httpClient.get).toHaveBeenCalledWith(
        'http://presence-service:3004/api/v1/presence/stats',
      );
    });
  });

  describe('getEvents', () => {
    it('should forward query params and append schoolId', async () => {
      const mockEvents = [{ id: 'event-1', eventType: 'BOARD' }];
      mockHttpClient.get.mockResolvedValue(mockEvents);

      const result = await service.getEvents(
        { routeId: 'route-1', eventType: 'BOARD' },
        adminUser,
      );

      expect(result).toEqual(mockEvents);
      const calledUrl = (httpClient.get as jest.Mock).mock
        .calls[0][0] as string;
      expect(calledUrl).toContain('routeId=route-1');
      expect(calledUrl).toContain('eventType=BOARD');
      expect(calledUrl).toContain('schoolId=school-1');
    });

    it('should filter out empty string values from query', async () => {
      mockHttpClient.get.mockResolvedValue([]);

      await service.getEvents(
        { routeId: 'route-1', eventType: '', studentId: null },
        adminUser,
      );

      const calledUrl = (httpClient.get as jest.Mock).mock
        .calls[0][0] as string;
      expect(calledUrl).toContain('routeId=route-1');
      expect(calledUrl).not.toContain('eventType=');
      expect(calledUrl).not.toContain('studentId=');
    });
  });

  describe('processEvents', () => {
    it('should POST events to presence service', async () => {
      const dto = {
        routeId: 'route-1',
        events: [{ studentId: 's1', eventType: 'BOARD' }],
      };
      const mockResponse = { processed: 1 };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.processEvents(dto, adminUser);

      expect(result).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://presence-service:3004/api/v1/presence-events',
        { ...dto, schoolId: 'school-1' },
      );
    });

    it('should not overwrite existing schoolId in dto', async () => {
      const dto = {
        routeId: 'route-1',
        schoolId: 'school-override',
        events: [],
      };
      mockHttpClient.post.mockResolvedValue({});

      await service.processEvents(dto, adminUser);

      expect(httpClient.post).toHaveBeenCalledWith(
        'http://presence-service:3004/api/v1/presence-events',
        dto,
      );
    });
  });

  describe('manualOverride', () => {
    it('should POST manual override to presence service', async () => {
      const dto = {
        studentId: 's1',
        eventType: 'ALIGHT',
        routeId: 'route-1',
      };
      mockHttpClient.post.mockResolvedValue({ success: true });

      const result = await service.manualOverride(dto, adminUser);

      expect(result).toEqual({ success: true });
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://presence-service:3004/api/v1/student-presence-events/manual',
        { ...dto, schoolId: 'school-1' },
      );
    });

    it('should work without user context', async () => {
      const dto = {
        studentId: 's1',
        eventType: 'BOARD',
        schoolId: 'school-1',
      };
      mockHttpClient.post.mockResolvedValue({});

      await service.manualOverride(dto);

      expect(httpClient.post).toHaveBeenCalledWith(
        'http://presence-service:3004/api/v1/student-presence-events/manual',
        dto,
      );
    });
  });
});
