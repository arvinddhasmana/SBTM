import { Test, TestingModule } from '@nestjs/testing';
import { VideoGatewayService } from './video.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';

describe('VideoGatewayService', () => {
  let service: VideoGatewayService;
  let httpClient: HttpClientService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'VIDEO_SERVICE_URL') return 'http://video-service:3005';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoGatewayService,
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

    service = module.get<VideoGatewayService>(VideoGatewayService);
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVideoEvents', () => {
    it('should call video service with query params', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          routeId: 'route-1',
          vehicleId: 'BUS-01',
          timestamp: '2025-01-01T08:00:00Z',
          eventType: 'STOP_CAMERA',
          videoUrl: 'https://example.com/video1.mp4',
        },
      ];
      mockHttpClient.get.mockResolvedValue(mockEvents);

      const result = await service.getVideoEvents({
        routeId: 'route-1',
        vehicleId: 'BUS-01',
        eventType: 'STOP_CAMERA',
        schoolId: 'school-1',
        from: '2025-01-01',
        to: '2025-01-02',
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(mockEvents);
      const calledUrl = (httpClient.get as jest.Mock).mock
        .calls[0][0] as string;
      expect(calledUrl).toContain('routeId=route-1');
      expect(calledUrl).toContain('vehicleId=BUS-01');
      expect(calledUrl).toContain('eventType=STOP_CAMERA');
      expect(calledUrl).toContain('schoolId=school-1');
      expect(calledUrl).toContain('from=2025-01-01');
      expect(calledUrl).toContain('to=2025-01-02');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=10');
    });

    it('should omit undefined query params', async () => {
      mockHttpClient.get.mockResolvedValue([]);

      await service.getVideoEvents({ routeId: 'route-1' });

      const calledUrl = (httpClient.get as jest.Mock).mock
        .calls[0][0] as string;
      expect(calledUrl).toContain('routeId=route-1');
      expect(calledUrl).not.toContain('vehicleId=');
      expect(calledUrl).not.toContain('schoolId=');
    });

    it('should return empty array when no events found', async () => {
      mockHttpClient.get.mockResolvedValue([]);

      const result = await service.getVideoEvents({});

      expect(result).toEqual([]);
    });
  });

  describe('getVideoEventById', () => {
    it('should return a single video event', async () => {
      const mockEvent = {
        id: 'event-1',
        routeId: 'route-1',
        vehicleId: 'BUS-01',
        timestamp: '2025-01-01T08:00:00Z',
        eventType: 'STOP_CAMERA',
        videoUrl: 'https://example.com/video1.mp4',
      };
      mockHttpClient.get.mockResolvedValue(mockEvent);

      const result = await service.getVideoEventById('event-1');

      expect(result).toEqual(mockEvent);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://video-service:3005/api/v1/video-events/event-1',
      );
    });
  });

  describe('createVideoEvent', () => {
    it('should POST a new video event and return id', async () => {
      const dto = {
        vehicleId: 'BUS-01',
        routeId: 'route-1',
        schoolId: 'school-1',
        eventType: 'STOP_CAMERA',
        timestamp: '2025-01-01T08:00:00Z',
        durationSeconds: 30,
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      };
      const mockResponse = { videoEventId: 'event-new' };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.createVideoEvent(dto);

      expect(result).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://video-service:3005/api/v1/video-events',
        dto,
      );
    });
  });
});
