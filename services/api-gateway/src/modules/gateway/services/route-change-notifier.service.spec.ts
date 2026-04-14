import { Test, TestingModule } from '@nestjs/testing';
import { RouteChangeNotifierService } from './route-change-notifier.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

describe('RouteChangeNotifierService', () => {
  let service: RouteChangeNotifierService;
  let httpClient: HttpClientService;

  const mockHttpClient = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'NOTIFICATION_SERVICE_URL')
        return 'http://notification-service:3008';
      return defaultValue;
    }),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteChangeNotifierService,
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

    service = module.get<RouteChangeNotifierService>(
      RouteChangeNotifierService,
    );
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyRouteChange', () => {
    it('should send notification to each parent on the route', async () => {
      mockDataSource.query.mockResolvedValue([
        { parentId: 'parent-1' },
        { parentId: 'parent-2' },
      ]);
      mockHttpClient.post.mockResolvedValue({});

      await service.notifyRouteChange(
        'ROUTE-A-AM',
        'Schedule changed',
        'school-1',
      );

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT'),
        ['ROUTE-A-AM'],
      );
      expect(httpClient.post).toHaveBeenCalledTimes(2);
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://notification-service:3008/api/v1/notifications/send',
        {
          eventType: 'ROUTE_CHANGE',
          eventSourceId: 'ROUTE-A-AM',
          recipientUserId: 'parent-1',
          schoolId: 'school-1',
        },
      );
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://notification-service:3008/api/v1/notifications/send',
        {
          eventType: 'ROUTE_CHANGE',
          eventSourceId: 'ROUTE-A-AM',
          recipientUserId: 'parent-2',
          schoolId: 'school-1',
        },
      );
    });

    it('should do nothing when no parents found for route', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.notifyRouteChange('ROUTE-EMPTY', 'No students', 'school-1');

      expect(httpClient.post).not.toHaveBeenCalled();
    });

    it('should continue sending to remaining parents when one fails', async () => {
      mockDataSource.query.mockResolvedValue([
        { parentId: 'parent-1' },
        { parentId: 'parent-2' },
        { parentId: 'parent-3' },
      ]);
      mockHttpClient.post
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Notification failed'))
        .mockResolvedValueOnce({});

      await service.notifyRouteChange('ROUTE-A-AM', 'Bus delay', 'school-1');

      // Should still attempt all 3 notifications
      expect(httpClient.post).toHaveBeenCalledTimes(3);
    });
  });
});
