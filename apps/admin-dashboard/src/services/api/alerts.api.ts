import axios from 'axios';
import type { Alert } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Mock alerts data for demo
const mockAlerts: Alert[] = [
    {
        id: 'alert-001',
        routeId: 'route-123',
        vehicleId: 'bus-45',
        timestamp: new Date().toISOString(),
        eventType: 'PANIC_BUTTON',
        status: 'ACTIVE',
        description: 'Driver triggered panic button at Main St',
    },
    {
        id: 'alert-002',
        routeId: 'route-456',
        vehicleId: 'bus-22',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        eventType: 'INCIDENT',
        status: 'ACTIVE',
        description: 'Route deviation detected',
    },
    {
        id: 'alert-003',
        routeId: 'route-789',
        vehicleId: 'bus-33',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        eventType: 'OTHER',
        status: 'RESOLVED',
        description: 'Vehicle stopped for extended period',
    },
];

export const alertsApi = {
    /**
     * Get all active alerts
     */
    async getActiveAlerts(): Promise<Alert[]> {
        try {
            const response = await axios.get<Alert[]>(`${API_BASE_URL}/api/v1/alerts/active`);
            return response.data;
        } catch (error) {
            // Return mock data for demo
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return mockAlerts.filter(a => a.status === 'ACTIVE');
            }
            throw error;
        }
    },

    /**
     * Get all alerts
     */
    async getAllAlerts(): Promise<Alert[]> {
        try {
            const response = await axios.get<Alert[]>(`${API_BASE_URL}/api/v1/alerts`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return mockAlerts;
            }
            throw error;
        }
    },

    /**
     * Get alert by ID
     */
    async getAlertById(id: string): Promise<Alert | undefined> {
        try {
            const response = await axios.get<Alert>(`${API_BASE_URL}/api/v1/alerts/${id}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 200));
                return mockAlerts.find(a => a.id === id);
            }
            throw error;
        }
    },

    /**
     * Resolve an alert
     */
    async resolveAlert(id: string): Promise<Alert> {
        try {
            const response = await axios.patch<Alert>(`${API_BASE_URL}/api/v1/alerts/${id}/resolve`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                const alert = mockAlerts.find(a => a.id === id);
                if (alert) {
                    return { ...alert, status: 'RESOLVED' };
                }
                throw new Error('Alert not found');
            }
            throw error;
        }
    },
};
