import axios from 'axios';

const BASE_URL = '/compliance-gateway';

export const complianceApi = {
    getAllInspections: async (schoolId?: string) => {
        const response = await axios.get(`${BASE_URL}/inspections`, {
            params: { schoolId }
        });
        return response.data;
    },

    getDriverCompliance: async (driverId: string) => {
        const response = await axios.get(`${BASE_URL}/driver/${driverId}`);
        return response.data;
    },

    getAllCompliance: async (schoolId?: string) => {
        const response = await axios.get(`${BASE_URL}`, {
            params: { schoolId }
        });
        return response.data;
    },

    getAuditLogs: async (schoolId?: string) => {
        const response = await axios.get(`${BASE_URL}/audit`, {
            params: { schoolId }
        });
        return response.data;
    }
};
