import type { Alert } from '../../types';
import { apiClient } from './api-client';

export const alertsApi = {
    async getActiveAlerts(): Promise<Alert[]> {
        const response = await apiClient.get<Alert[]>('/api/v1/alerts/active');
        return response.data;
    },

    async getAllAlerts(): Promise<Alert[]> {
        const response = await apiClient.get<Alert[]>('/api/v1/alerts');
        return response.data;
    },

    async getAlertById(id: string): Promise<Alert | undefined> {
        const response = await apiClient.get<Alert>(`/api/v1/alerts/${id}`);
        return response.data;
    },

    async resolveAlert(id: string): Promise<Alert> {
        const response = await apiClient.patch<Alert>(`/api/v1/alerts/${id}/resolve`);
        return response.data;
    },
};
