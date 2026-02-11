import { apiClient } from './api-client';

export const complianceApi = {
    getAllInspections: async (schoolId?: string) => {
        const response = await apiClient.get('/api/v1/inspections', {
            params: { schoolId }
        });
        return response.data;
    },

    getDriverCompliance: async (driverId: string) => {
        const response = await apiClient.get(`/api/v1/compliance/driver/${driverId}`);
        return response.data;
    },

    getAllCompliance: async (schoolId?: string) => {
        const response = await apiClient.get('/api/v1/compliance', {
            params: { schoolId }
        });
        return response.data;
    },

    getAuditLogs: async (schoolId?: string) => {
        const response = await apiClient.get('/api/v1/audit', {
            params: { schoolId }
        });
        return response.data;
    }
};
