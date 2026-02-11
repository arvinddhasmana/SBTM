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
            expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/alerts/alert-1/resolve');
        });
    });
});
