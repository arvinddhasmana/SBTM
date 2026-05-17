import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSettingsGatewayService } from './notification-settings.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';

describe('NotificationSettingsGatewayService', () => {
  let service: NotificationSettingsGatewayService;
  let httpClient: HttpClientService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'NOTIFICATION_SERVICE_URL')
        return 'http://notification-service:3008';
      return defaultValue;
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'NOTIFICATION_SERVICE_URL')
        return 'http://notification-service:3008';
      throw new Error(`Config key ${key} not found`);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSettingsGatewayService,
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

    service = module.get<NotificationSettingsGatewayService>(
      NotificationSettingsGatewayService,
    );
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPreferences', () => {
    it('should call notification service with userId and schoolId', async () => {
      const mockPreferences = [
        {
          id: 'pref-1',
          eventType: 'ROUTE_CHANGE',
          channel: 'email',
          enabled: true,
        },
      ];
      mockHttpClient.get.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences('user-1', 'school-1');

      expect(result).toEqual(mockPreferences);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://notification-service:3008/api/v1/notification-preferences',
        { params: { userId: 'user-1', schoolId: 'school-1' } },
      );
    });
  });

  describe('updatePreferences', () => {
    it('should PUT preferences to notification service', async () => {
      const payload = {
        userId: 'user-1',
        schoolId: 'school-1',
        preferences: [
          { eventType: 'ROUTE_CHANGE', channel: 'push', enabled: false },
        ],
      };
      const mockResponse = payload.preferences;
      mockHttpClient.put.mockResolvedValue(mockResponse);

      const result = await service.updatePreferences(payload);

      expect(result).toEqual(mockResponse);
      expect(httpClient.put).toHaveBeenCalledWith(
        'http://notification-service:3008/api/v1/notification-preferences',
        payload,
      );
    });
  });

  describe('registerDeviceToken', () => {
    it('should POST device token to notification service', async () => {
      const payload = {
        recipientId: 'user-1',
        schoolId: 'school-1',
        token: 'fcm-token-abc',
        platform: 'android',
      };
      const mockResponse = { id: 'token-1' };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.registerDeviceToken(payload);

      expect(result).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://notification-service:3008/api/v1/device-tokens',
        payload,
      );
    });
  });

  describe('deactivateDeviceToken', () => {
    it('should DELETE device token via notification service', async () => {
      const mockResponse = { deactivated: true };
      mockHttpClient.delete.mockResolvedValue(mockResponse);

      const result = await service.deactivateDeviceToken('token-1', 'user-1');

      expect(result).toEqual(mockResponse);
      expect(httpClient.delete).toHaveBeenCalledWith(
        'http://notification-service:3008/api/v1/device-tokens/token-1?recipientId=user-1&recipientKind=user',
      );
    });
  });

  describe('getDeviceTokens', () => {
    it('should GET device tokens with recipientId, schoolId, recipientKind params', async () => {
      const mockTokens = [{ id: 'token-1', platform: 'android' }];
      mockHttpClient.get.mockResolvedValue(mockTokens);

      const result = await service.getDeviceTokens('user-1', 'school-1');

      expect(result).toEqual(mockTokens);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://notification-service:3008/api/v1/device-tokens',
        {
          params: {
            recipientId: 'user-1',
            schoolId: 'school-1',
            recipientKind: 'user',
          },
        },
      );
    });
  });

  describe('getDeliveryLog', () => {
    it('should GET delivery log with userId and schoolId params', async () => {
      const mockLog = [{ id: 'log-1', status: 'delivered' }];
      mockHttpClient.get.mockResolvedValue(mockLog);

      const result = await service.getDeliveryLog('user-1', 'school-1');

      expect(result).toEqual(mockLog);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://notification-service:3008/api/v1/delivery-log',
        { params: { userId: 'user-1', schoolId: 'school-1' } },
      );
    });
  });
});
