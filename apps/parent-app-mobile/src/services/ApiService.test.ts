import { ApiService } from './ApiService';
import { AuthService } from './AuthService';
import axios from 'axios';

jest.mock('./AuthService');

describe('ApiService', () => {
  // axios is auto-mocked via __mocks__/axios.js; create() returns itself
  const mockClient = axios as any;

  beforeEach(() => {
    // Clear only the HTTP method mocks between tests; do NOT clear interceptors
    // mocks because they are registered once at module-init time and checking
    // them with toHaveBeenCalled() depends on that one-time call history.
    mockClient.get.mockClear();
    mockClient.post.mockClear();
    mockClient.put.mockClear();
    mockClient.delete.mockClear();
    mockClient.patch.mockClear();
  });

  describe('GET request', () => {
    it('should make GET request and return data', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockClient.get.mockResolvedValueOnce({ data: mockData });

      const result = await ApiService.get('/test');

      expect(mockClient.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockData);
    });

    it('should pass config to GET request', async () => {
      const mockData = { id: 1 };
      mockClient.get.mockResolvedValueOnce({ data: mockData });

      const config = { params: { page: 1 } };
      await ApiService.get('/test', config);

      expect(mockClient.get).toHaveBeenCalledWith('/test', config);
    });

    it('should handle GET request errors', async () => {
      const error = new Error('Network error');
      mockClient.get.mockRejectedValueOnce(error);

      await expect(ApiService.get('/test')).rejects.toThrow();
    });
  });

  describe('POST request', () => {
    it('should make POST request and return data', async () => {
      const mockData = { success: true };
      const payload = { name: 'Test' };
      mockClient.post.mockResolvedValueOnce({ data: mockData });

      const result = await ApiService.post('/test', payload);

      expect(mockClient.post).toHaveBeenCalledWith('/test', payload, undefined);
      expect(result).toEqual(mockData);
    });

    it('should pass config to POST request', async () => {
      const mockData = { success: true };
      const payload = { name: 'Test' };
      const config = { headers: { 'Custom-Header': 'value' } };
      mockClient.post.mockResolvedValueOnce({ data: mockData });

      await ApiService.post('/test', payload, config);

      expect(mockClient.post).toHaveBeenCalledWith('/test', payload, config);
    });
  });

  describe('PUT request', () => {
    it('should make PUT request and return data', async () => {
      const mockData = { updated: true };
      const payload = { name: 'Updated' };
      mockClient.put.mockResolvedValueOnce({ data: mockData });

      const result = await ApiService.put('/test/1', payload);

      expect(mockClient.put).toHaveBeenCalledWith('/test/1', payload, undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('DELETE request', () => {
    it('should make DELETE request and return data', async () => {
      const mockData = { deleted: true };
      mockClient.delete.mockResolvedValueOnce({ data: mockData });

      const result = await ApiService.delete('/test/1');

      expect(mockClient.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(mockData);
    });
  });

  describe('Interceptors', () => {
    it('should register request interceptor', () => {
      expect(mockClient.interceptors.request.use).toHaveBeenCalled();
    });

    it('should register response interceptor', () => {
      expect(mockClient.interceptors.response.use).toHaveBeenCalled();
    });
  });
});
