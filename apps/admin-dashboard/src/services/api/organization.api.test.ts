import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizationApi } from './organization.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('organizationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listBoards', () => {
    it('should return boards from API', async () => {
      const mockBoards = [
        { id: 'b-1', name: 'Board A' },
        { id: 'b-2', name: 'Board B' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBoards });

      const result = await organizationApi.listBoards();

      expect(result).toEqual(mockBoards);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/boards');
    });
  });

  describe('getBoard', () => {
    it('should return a single board by id', async () => {
      const mockBoard = { id: 'b-1', name: 'Board A' };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBoard });

      const result = await organizationApi.getBoard('b-1');

      expect(result).toEqual(mockBoard);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/boards/b-1');
    });
  });

  describe('createBoard', () => {
    it('should post new board data', async () => {
      const payload = { name: 'Board C' };
      const mockResponse = { id: 'b-3', name: 'Board C' };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await organizationApi.createBoard(payload);

      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/boards', payload);
    });
  });

  describe('updateBoard', () => {
    it('should patch board data by id', async () => {
      const payload = { name: 'Updated Board' };
      const mockResponse = { id: 'b-1', name: 'Updated Board' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await organizationApi.updateBoard('b-1', payload);

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/boards/b-1', payload);
    });
  });

  describe('deleteBoard', () => {
    it('should delete board by id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({});

      await organizationApi.deleteBoard('b-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/boards/b-1');
    });
  });

  describe('listSchools', () => {
    it('should return schools with mapped location from API', async () => {
      const rawSchools = [
        { id: 's-1', name: 'School A', boardId: 'b-1', lat: 45.42, lng: -75.69 },
        { id: 's-2', name: 'School B', boardId: 'b-1', lat: 43.65, lng: -79.38 },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: rawSchools });

      const result = await organizationApi.listSchools();

      expect(result).toEqual([
        { id: 's-1', name: 'School A', boardId: 'b-1', location: { lat: 45.42, lng: -75.69 } },
        { id: 's-2', name: 'School B', boardId: 'b-1', location: { lat: 43.65, lng: -79.38 } },
      ]);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/schools', {
        params: undefined,
      });
    });

    it('should pass boardId param when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await organizationApi.listSchools('b-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/schools', {
        params: { boardId: 'b-1' },
      });
    });

    it('should handle schools without lat/lng', async () => {
      const rawSchools = [{ id: 's-3', name: 'School C', boardId: 'b-2', lat: null, lng: null }];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: rawSchools });

      const result = await organizationApi.listSchools();

      expect(result).toEqual([
        { id: 's-3', name: 'School C', boardId: 'b-2', location: undefined },
      ]);
    });
  });

  describe('getSchool', () => {
    it('should return a single school with mapped location', async () => {
      const rawSchool = { id: 's-1', name: 'School A', boardId: 'b-1', lat: 45.42, lng: -75.69 };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: rawSchool });

      const result = await organizationApi.getSchool('s-1');

      expect(result).toEqual({
        id: 's-1',
        name: 'School A',
        boardId: 'b-1',
        location: { lat: 45.42, lng: -75.69 },
      });
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/schools/s-1');
    });
  });

  describe('createSchool', () => {
    it('should post new school data', async () => {
      const payload = { name: 'New School', boardId: 'b-1' };
      const mockResponse = { id: 's-4', name: 'New School', boardId: 'b-1' };

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResponse });

      const result = await organizationApi.createSchool(payload);

      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/schools', payload);
    });
  });

  describe('updateSchool', () => {
    it('should patch school data by id', async () => {
      const payload = { name: 'Updated School' };
      const mockResponse = { id: 's-1', name: 'Updated School', boardId: 'b-1' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResponse });

      const result = await organizationApi.updateSchool('s-1', payload);

      expect(result).toEqual(mockResponse);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/schools/s-1', payload);
    });
  });

  describe('deleteSchool', () => {
    it('should delete school by id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({});

      await organizationApi.deleteSchool('s-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/schools/s-1');
    });
  });
});
