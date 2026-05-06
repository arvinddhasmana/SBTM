/**
 * Unit tests for SystemSettingsGatewayService
 *
 * Tests that the gateway service calls the correct GPS tracking service URLs
 * and forwards parameters correctly.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { SystemSettingsGatewayService } from './system-settings.gateway.service';

const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'GPS_SERVICE_URL') return 'http://gps-service:3002';
    return defaultValue;
  }),
};

describe('SystemSettingsGatewayService', () => {
  let service: SystemSettingsGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemSettingsGatewayService,
        { provide: HttpClientService, useValue: mockHttpClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SystemSettingsGatewayService>(
      SystemSettingsGatewayService,
    );
    jest.clearAllMocks();
  });

  describe('getGpsSource', () => {
    it('calls the correct GPS service URL', async () => {
      mockHttpClient.get.mockResolvedValue({ source: 'DRIVER_APP' });
      const result = await service.getGpsSource();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://gps-service:3002/api/v1/system-settings/gps-source',
      );
      expect(result).toEqual({ source: 'DRIVER_APP' });
    });
  });

  describe('setGpsSource', () => {
    it('calls PUT with correct payload', async () => {
      mockHttpClient.put.mockResolvedValue({ source: 'DEDICATED_GPS' });
      await service.setGpsSource('DEDICATED_GPS', 'super-admin-id');
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        'http://gps-service:3002/api/v1/system-settings/gps-source',
        { source: 'DEDICATED_GPS', updatedBy: 'super-admin-id' },
      );
    });
  });

  describe('createDeviceToken', () => {
    it('calls POST with correct payload', async () => {
      const createdResponse = {
        id: 'tok-1',
        token: 'a'.repeat(64),
        maskedToken: '...aaaaaaaa',
        vehicleId: 'VEH-001',
        schoolId: 'sch-001',
        description: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastSeenAt: null,
      };
      mockHttpClient.post.mockResolvedValue(createdResponse);

      const result = await service.createDeviceToken({
        vehicleId: 'VEH-001',
        schoolId: 'sch-001',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'http://gps-service:3002/api/v1/device-tokens',
        { vehicleId: 'VEH-001', schoolId: 'sch-001', description: undefined },
      );
      expect(result.token).toBe('a'.repeat(64));
    });
  });

  describe('listDeviceTokens', () => {
    it('calls GET with schoolId query parameter', async () => {
      mockHttpClient.get.mockResolvedValue([]);
      await service.listDeviceTokens('sch-tenant-1');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://gps-service:3002/api/v1/device-tokens?schoolId=sch-tenant-1',
      );
    });
  });

  describe('deleteDeviceToken', () => {
    it('calls DELETE with the correct URL', async () => {
      mockHttpClient.delete.mockResolvedValue(undefined);
      await service.deleteDeviceToken('tok-id-123');
      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        'http://gps-service:3002/api/v1/device-tokens/tok-id-123',
      );
    });
  });

  describe('ingestDeviceLocation', () => {
    it('forwards payload with device Bearer token (not service JWT)', async () => {
      mockHttpClient.post.mockResolvedValue({ status: 'ok' });
      const deviceToken = 'b'.repeat(64);
      const payload = {
        timestamp: '2026-05-04T14:00:00.000Z',
        lat: 43.651,
        lng: -79.347,
      };

      await service.ingestDeviceLocation(payload, deviceToken);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'http://gps-service:3002/api/v1/device-locations',
        payload,
        { headers: { Authorization: `Bearer ${deviceToken}` } },
      );
    });
  });
});
