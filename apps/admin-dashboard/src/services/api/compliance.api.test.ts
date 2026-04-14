import { describe, it, expect, vi, beforeEach } from 'vitest';
import { complianceApi } from './compliance.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('complianceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllInspections', () => {
    it('should return inspections from API', async () => {
      const mockInspections = [
        { id: 'insp-1', vehicleId: 'v-1', status: 'passed' },
        { id: 'insp-2', vehicleId: 'v-2', status: 'failed' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockInspections });

      const result = await complianceApi.getAllInspections();

      expect(result).toEqual(mockInspections);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/inspections', {
        params: { schoolId: undefined },
      });
    });

    it('should pass schoolId when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await complianceApi.getAllInspections('school-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/inspections', {
        params: { schoolId: 'school-1' },
      });
    });
  });

  describe('getDriverCompliance', () => {
    it('should return driver compliance data', async () => {
      const mockCompliance = { driverId: 'drv-1', licenseValid: true };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockCompliance });

      const result = await complianceApi.getDriverCompliance('drv-1');

      expect(result).toEqual(mockCompliance);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/compliance/driver/drv-1');
    });
  });

  describe('getAllCompliance', () => {
    it('should return all compliance data', async () => {
      const mockData = [{ id: 'comp-1', status: 'compliant' }];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await complianceApi.getAllCompliance();

      expect(result).toEqual(mockData);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/compliance', {
        params: { schoolId: undefined },
      });
    });

    it('should pass schoolId when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await complianceApi.getAllCompliance('school-2');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/compliance', {
        params: { schoolId: 'school-2' },
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs', async () => {
      const mockLogs = [{ id: 'log-1', action: 'LOGIN', userId: 'user-1' }];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockLogs });

      const result = await complianceApi.getAuditLogs();

      expect(result).toEqual(mockLogs);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit', {
        params: { schoolId: undefined },
      });
    });

    it('should pass schoolId when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await complianceApi.getAuditLogs('school-3');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit', {
        params: { schoolId: 'school-3' },
      });
    });
  });
});
