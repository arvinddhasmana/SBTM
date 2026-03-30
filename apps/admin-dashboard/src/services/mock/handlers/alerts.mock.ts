import { MOCK_ALERTS } from '../data/alerts.data';

export const mockAlertsApi = {
    getActiveAlerts: async () => MOCK_ALERTS,
    getAllAlerts: async () => MOCK_ALERTS,
    getAlertById: async (id: string) => MOCK_ALERTS.find(a => a.id === id) || MOCK_ALERTS[0],
    resolveAlert: async (id: string) => ({ ...MOCK_ALERTS[0], id, status: 'RESOLVED' as const }),
};
