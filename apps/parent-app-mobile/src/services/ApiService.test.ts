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

  describe('Interceptors', () => {
    it('should register request interceptor', () => {
      const mockInstance = mockAxios.create();
      expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it('should register response interceptor', () => {
      const mockInstance = mockAxios.create();
      expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });
});
