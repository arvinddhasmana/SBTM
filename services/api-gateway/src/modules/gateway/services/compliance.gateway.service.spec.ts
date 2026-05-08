import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceGatewayService } from './compliance.gateway.service';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { ConfigService } from '@nestjs/config';
import { HttpException, InternalServerErrorException } from '@nestjs/common';

describe('ComplianceGatewayService', () => {
  let service: ComplianceGatewayService;
  let httpClient: HttpClientService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
      if (key === 'COMPLIANCE_SERVICE_URL')
        return 'http://compliance-service:3007';
      return defaultValue;
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'COMPLIANCE_SERVICE_URL')
        return 'http://compliance-service:3007';
      throw new Error(`Config key ${key} not found`);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceGatewayService,
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

    service = module.get<ComplianceGatewayService>(ComplianceGatewayService);
    httpClient = module.get<HttpClientService>(HttpClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forward', () => {
    it('should forward GET requests to compliance service', async () => {
      const mockResponse = { data: 'compliance-data' };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.forward(
        'GET',
        '/api/v1/reports',
        undefined,
        {
          schoolId: 'school-1',
        },
      );

      expect(result).toEqual(mockResponse);
      expect(httpClient.get).toHaveBeenCalledWith(
        'http://compliance-service:3007/api/v1/reports',
        { params: { schoolId: 'school-1' } },
      );
    });

    it('should forward POST requests with data', async () => {
      const mockResponse = { id: 'report-1' };
      const postData = { name: 'Safety Report' };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await service.forward('POST', '/api/v1/reports', postData);

      expect(result).toEqual(mockResponse);
      expect(httpClient.post).toHaveBeenCalledWith(
        'http://compliance-service:3007/api/v1/reports',
        postData,
        { params: undefined },
      );
    });

    it('should forward PUT requests with data', async () => {
      const mockResponse = { updated: true };
      const putData = { name: 'Updated Report' };
      mockHttpClient.put.mockResolvedValue(mockResponse);

      const result = await service.forward('PUT', '/api/v1/reports/1', putData);

      expect(result).toEqual(mockResponse);
      expect(httpClient.put).toHaveBeenCalledWith(
        'http://compliance-service:3007/api/v1/reports/1',
        putData,
        { params: undefined },
      );
    });

    it('should forward PATCH requests with data', async () => {
      const mockResponse = { patched: true };
      const patchData = { status: 'reviewed' };
      mockHttpClient.patch.mockResolvedValue(mockResponse);

      const result = await service.forward(
        'PATCH',
        '/api/v1/reports/1',
        patchData,
      );

      expect(result).toEqual(mockResponse);
      expect(httpClient.patch).toHaveBeenCalledWith(
        'http://compliance-service:3007/api/v1/reports/1',
        patchData,
        { params: undefined },
      );
    });

    it('should forward DELETE requests', async () => {
      const mockResponse = { deleted: true };
      mockHttpClient.delete.mockResolvedValue(mockResponse);

      const result = await service.forward('DELETE', '/api/v1/reports/1');

      expect(result).toEqual(mockResponse);
      expect(httpClient.delete).toHaveBeenCalledWith(
        'http://compliance-service:3007/api/v1/reports/1',
        { params: undefined },
      );
    });

    it('should default to GET for unknown method', async () => {
      const mockResponse = { data: 'default' };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.forward('OPTIONS', '/api/v1/reports');

      expect(result).toEqual(mockResponse);
      expect(httpClient.get).toHaveBeenCalled();
    });

    it('should re-throw HttpException from downstream service', async () => {
      const httpError = new HttpException('Bad Request', 400);
      mockHttpClient.get.mockRejectedValue(httpError);

      await expect(service.forward('GET', '/api/v1/reports')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw InternalServerErrorException for non-HTTP errors', async () => {
      const genericError = new Error('Connection refused');
      mockHttpClient.get.mockRejectedValue(genericError);

      await expect(service.forward('GET', '/api/v1/reports')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
