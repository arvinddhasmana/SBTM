import { ApiService } from './ApiService';
import { AuthService } from './AuthService';
import axios from 'axios';

jest.mock('./AuthService');
jest.mock('axios');

describe('ApiService', () => {
  const mockAxios = axios as jest.Mocked<typeof axios>;
  const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock axios instance
    const mockInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    mockAxios.create.mockReturnValue(mockInstance as any);
  });

  describe('GET request', () => {
    it('should make GET request and return data', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockInstance = mockAxios.create();
      (mockInstance.get as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await ApiService.get('/test');

      expect(mockInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockData);
    });

    it('should pass config to GET request', async () => {
      const mockData = { id: 1 };
      const mockInstance = mockAxios.create();
      (mockInstance.get as jest.Mock).mockResolvedValue({ data: mockData });

      const config = { params: { page: 1 } };
      await ApiService.get('/test', config);

      expect(mockInstance.get).toHaveBeenCalledWith('/test', config);
    });

    it('should handle GET request errors', async () => {
      const mockInstance = mockAxios.create();
      const error = new Error('Network error');
      (mockInstance.get as jest.Mock).mockRejectedValue(error);

      await expect(ApiService.get('/test')).rejects.toThrow();
    });
  });

  describe('POST request', () => {
    it('should make POST request and return data', async () => {
      const mockData = { success: true };
      const payload = { name: 'Test' };
      const mockInstance = mockAxios.create();
      (mockInstance.post as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await ApiService.post('/test', payload);

      expect(mockInstance.post).toHaveBeenCalledWith('/test', payload, undefined);
      expect(result).toEqual(mockData);
    });

    it('should pass config to POST request', async () => {
      const mockData = { success: true };
      const payload = { name: 'Test' };
      const config = { headers: { 'Custom-Header': 'value' } };
      const mockInstance = mockAxios.create();
      (mockInstance.post as jest.Mock).mockResolvedValue({ data: mockData });

      await ApiService.post('/test', payload, config);

      expect(mockInstance.post).toHaveBeenCalledWith('/test', payload, config);
    });
  });

  describe('PUT request', () => {
    it('should make PUT request and return data', async () => {
      const mockData = { updated: true };
      const payload = { name: 'Updated' };
      const mockInstance = mockAxios.create();
      (mockInstance.put as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await ApiService.put('/test/1', payload);

      expect(mockInstance.put).toHaveBeenCalledWith('/test/1', payload, undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('DELETE request', () => {
    it('should make DELETE request and return data', async () => {
      const mockData = { deleted: true };
      const mockInstance = mockAxios.create();
      (mockInstance.delete as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await ApiService.delete('/test/1');

      expect(mockInstance.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('Request interceptor', () => {
    it('should attach JWT token to requests', async () => {
      const token = 'test-jwt-token';
      mockAuthService.getToken.mockResolvedValue(token);

      // Create new instance to trigger interceptor registration
      const mockInstance = mockAxios.create();
      const requestInterceptor = (mockInstance.interceptors.request.use as jest.Mock).mock.calls[0][0];

      const config = { headers: {} } as any;
      const result = await requestInterceptor(config);

      expect(mockAuthService.getToken).toHaveBeenCalled();
      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('should not attach Authorization header when no token exists', async () => {
      mockAuthService.getToken.mockResolvedValue(null);

      const mockInstance = mockAxios.create();
      const requestInterceptor = (mockInstance.interceptors.request.use as jest.Mock).mock.calls[0][0];

      const config = { headers: {} } as any;
      const result = await requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response interceptor', () => {
    it('should handle 401 unauthorized errors', async () => {
      mockAuthService.clearAuth.mockResolvedValue(undefined);
      mockAuthService.handleUnauthorized.mockImplementation(() => {});

      const mockInstance = mockAxios.create();
      const errorInterceptor = (mockInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];

      const error = {
        response: { status: 401, data: { message: 'Unauthorized' } },
        config: {},
      };

      await expect(errorInterceptor(error)).rejects.toMatchObject({
        message: 'Unauthorized',
        statusCode: 401,
      });

      expect(mockAuthService.clearAuth).toHaveBeenCalled();
      expect(mockAuthService.handleUnauthorized).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const mockInstance = mockAxios.create();
      const errorInterceptor = (mockInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];

      const error = {
        request: {},
        message: 'Network Error',
      };

      await expect(errorInterceptor(error)).rejects.toMatchObject({
        message: 'Network Error',
        statusCode: 0,
      });
    });

    it('should handle generic errors', async () => {
      const mockInstance = mockAxios.create();
      const errorInterceptor = (mockInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];

      const error = new Error('Something went wrong');

      await expect(errorInterceptor(error)).rejects.toMatchObject({
        message: 'Something went wrong',
        statusCode: 500,
      });
    });
  });
});
