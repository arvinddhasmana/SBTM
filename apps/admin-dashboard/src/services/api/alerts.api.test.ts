import { describe, it, expect, vi, beforeEach } from 'vitest';
import { alertsApi } from './alerts.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('alertsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts from API', async () => {
      const mockAlerts = [
        { id: 'alert-1', status: 'ACTIVE', eventType: 'PANIC_BUTTON' },
        { id: 'alert-2', status: 'ACTIVE', eventType: 'INCIDENT' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAlerts });

      const result = await alertsApi.getActiveAlerts();

      expect(result).toEqual(mockAlerts);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/alerts/active');
    });
  });

  describe('getAllAlerts', () => {
    it('should return all alerts from API', async () => {
      const mockAlerts = [
        { id: 'alert-1', status: 'ACTIVE' },
        { id: 'alert-2', status: 'RESOLVED' },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAlerts });

      const result = await alertsApi.getAllAlerts();

      expect(result).toEqual(mockAlerts);
    });
  });

  describe('getAlertById', () => {
    it('should return specific alert', async () => {
      const mockAlert = { id: 'alert-1', status: 'ACTIVE', eventType: 'PANIC_BUTTON' };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAlert });

      const result = await alertsApi.getAlertById('alert-1');

      expect(result).toEqual(mockAlert);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/alerts/alert-1');
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', async () => {
      const mockResolvedAlert = { id: 'alert-1', status: 'RESOLVED' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResolvedAlert });

      const result = await alertsApi.resolveAlert('alert-1');

      expect(result.status).toBe('RESOLVED');
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/alerts/alert-1/resolve', {
        notes: undefined,
        actorUserId: undefined,
        actorRole: undefined,
      });
    });

    it('should resolve an alert with notes and actor context', async () => {
      const mockResolvedAlert = { id: 'alert-1', status: 'RESOLVED' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockResolvedAlert });

      const result = await alertsApi.resolveAlert(
        'alert-1',
        'Incident resolved on scene',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result.status).toBe('RESOLVED');
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/alerts/alert-1/resolve', {
        notes: 'Incident resolved on scene',
        actorUserId: 'admin-001',
        actorRole: 'SCHOOL_ADMIN',
      });
    });
  });

  describe('confirmAlert', () => {
    it('should confirm a Tier 1 alert with actor context', async () => {
      const mockConfirmedAlert = { id: 'alert-1', status: 'CONFIRMED' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockConfirmedAlert });

      const result = await alertsApi.confirmAlert('alert-1', 'admin-001', 'SCHOOL_ADMIN');

      expect(result.status).toBe('CONFIRMED');
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/alerts/alert-1/confirm', {
        actorUserId: 'admin-001',
        actorRole: 'SCHOOL_ADMIN',
      });
    });

    it('should confirm without actor context when not provided', async () => {
      const mockConfirmedAlert = { id: 'alert-1', status: 'CONFIRMED' };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockConfirmedAlert });

      await alertsApi.confirmAlert('alert-1');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/alerts/alert-1/confirm', {
        actorUserId: undefined,
        actorRole: undefined,
      });
    });
  });

  describe('falseAlarmAlert', () => {
    it('should mark a Tier 1 alert as false alarm', async () => {
      const mockAlert = { id: 'alert-1', status: 'FALSE_ALARM' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockAlert });

      const result = await alertsApi.falseAlarmAlert(
        'alert-1',
        'Drill test',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result.status).toBe('FALSE_ALARM');
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/alerts/alert-1/false-alarm', {
        actorUserId: 'admin-001',
        actorRole: 'SCHOOL_ADMIN',
        notes: 'Drill test',
      });
    });
  });

  describe('requestInfoAlert', () => {
    it('should request more information about an alert', async () => {
      const mockAlert = { id: 'alert-1', status: 'PENDING_CONFIRMATION' };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockAlert });

      const result = await alertsApi.requestInfoAlert('alert-1', 'admin-001', 'SCHOOL_ADMIN');

      expect(result).toEqual(mockAlert);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/alerts/alert-1/request-info', {
        actorUserId: 'admin-001',
        actorRole: 'SCHOOL_ADMIN',
      });
    });
  });

  describe('getAlertAuditLog', () => {
    it('should return audit entries for an alert', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          alertId: 'alert-1',
          eventType: 'CREATED',
          eventTimestamp: '2026-01-01T00:00:00Z',
        },
        {
          id: 'entry-2',
          alertId: 'alert-1',
          eventType: 'CONFIRMED',
          eventTimestamp: '2026-01-01T00:02:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockEntries });

      const result = await alertsApi.getAlertAuditLog('alert-1');

      expect(result).toHaveLength(2);
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/alerts/alert-1/audit-trail');
    });
  });

  describe('addStatusUpdate', () => {
    it('should add a status update to an alert', async () => {
      const mockEntry = {
        id: 'entry-1',
        alertId: 'alert-1',
        eventType: 'STATUS_UPDATE',
        notes: 'Police arrived',
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockEntry });

      const result = await alertsApi.addStatusUpdate(
        'alert-1',
        'Police arrived',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result).toEqual(mockEntry);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/alerts/alert-1/status-update', {
        notes: 'Police arrived',
        actorUserId: 'admin-001',
        actorRole: 'SCHOOL_ADMIN',
      });
    });
  });
});
