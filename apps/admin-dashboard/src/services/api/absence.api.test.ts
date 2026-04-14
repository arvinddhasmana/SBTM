import { describe, it, expect, vi, beforeEach } from 'vitest';
import { absenceApi } from './absence.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('absenceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAbsences', () => {
    it('should return absences from API without params', async () => {
      const mockAbsences = [
        { id: 'abs-1', studentId: 'stu-1', tripDate: '2026-04-14' },
        { id: 'abs-2', studentId: 'stu-2', tripDate: '2026-04-14' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAbsences });

      const result = await absenceApi.listAbsences();

      expect(result).toEqual(mockAbsences);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/absences/admin', {
        params: {},
      });
    });

    it('should pass date param when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await absenceApi.listAbsences('2026-04-14');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/absences/admin', {
        params: { date: '2026-04-14' },
      });
    });

    it('should pass schoolId param when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await absenceApi.listAbsences(undefined, 'school-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/absences/admin', {
        params: { schoolId: 'school-1' },
      });
    });

    it('should pass both date and schoolId params when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await absenceApi.listAbsences('2026-04-14', 'school-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/absences/admin', {
        params: { date: '2026-04-14', schoolId: 'school-1' },
      });
    });
  });

  describe('deleteAbsence', () => {
    it('should call delete with correct URL', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({});

      await absenceApi.deleteAbsence('abs-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/absences/abs-1');
    });
  });

  describe('confirmAbsence', () => {
    it('should call patch with correct URL', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({});

      await absenceApi.confirmAbsence('abs-1');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/absences/abs-1/confirm');
    });
  });

  describe('rejectAbsence', () => {
    it('should call patch with correct URL and notes', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({});

      await absenceApi.rejectAbsence('abs-1', 'Invalid absence');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/absences/abs-1/reject', {
        notes: 'Invalid absence',
      });
    });

    it('should call patch without notes when not provided', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({});

      await absenceApi.rejectAbsence('abs-1');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/absences/abs-1/reject', {
        notes: undefined,
      });
    });
  });
});
