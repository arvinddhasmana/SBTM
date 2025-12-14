import { describe, it, expect, vi, beforeEach } from 'vitest';
import { alertsApi } from './alerts.api';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
        isAxiosError: vi.fn((error) => error.isAxiosError),
    },
}));

import axios from 'axios';

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

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockAlerts });

            const result = await alertsApi.getActiveAlerts();

            expect(result).toEqual(mockAlerts);
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/v1/alerts/active'));
        });

        it('should return mock alerts when API is unavailable', async () => {
            const networkError = { isAxiosError: true, response: undefined };
            vi.mocked(axios.get).mockRejectedValueOnce(networkError);
            vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);

            const result = await alertsApi.getActiveAlerts();

            expect(result.length).toBeGreaterThan(0);
            expect(result.every((a) => a.status === 'ACTIVE')).toBe(true);
        });
    });

    describe('getAllAlerts', () => {
        it('should return all alerts from API', async () => {
            const mockAlerts = [
                { id: 'alert-1', status: 'ACTIVE' },
                { id: 'alert-2', status: 'RESOLVED' },
            ];

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockAlerts });

            const result = await alertsApi.getAllAlerts();

            expect(result).toEqual(mockAlerts);
        });
    });

    describe('getAlertById', () => {
        it('should return specific alert', async () => {
            const mockAlert = { id: 'alert-1', status: 'ACTIVE', eventType: 'PANIC_BUTTON' };

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockAlert });

            const result = await alertsApi.getAlertById('alert-1');

            expect(result).toEqual(mockAlert);
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/v1/alerts/alert-1'));
        });
    });

    describe('resolveAlert', () => {
        it('should resolve an alert', async () => {
            const mockResolvedAlert = { id: 'alert-1', status: 'RESOLVED' };

            vi.mocked(axios.patch).mockResolvedValueOnce({ data: mockResolvedAlert });

            const result = await alertsApi.resolveAlert('alert-1');

            expect(result.status).toBe('RESOLVED');
            expect(axios.patch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/alerts/alert-1/resolve'));
        });

        it('should handle resolve when API unavailable', async () => {
            const networkError = { isAxiosError: true, response: undefined };
            vi.mocked(axios.patch).mockRejectedValueOnce(networkError);
            vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);

            const result = await alertsApi.resolveAlert('alert-001');

            expect(result.status).toBe('RESOLVED');
        });
    });
});
