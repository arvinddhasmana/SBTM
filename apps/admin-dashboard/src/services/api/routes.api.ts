import axios from 'axios';
import type { Route, LiveLocation } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const mockRoutes: Route[] = [
    { id: 'route-123', name: 'Route 101 - North', schoolId: 'school-001', direction: 'AM', status: 'active', stops: [], startTime: '07:00', estimatedDuration: 60 },
    { id: 'route-456', name: 'Route 202 - South', schoolId: 'school-001', direction: 'AM', status: 'active', stops: [], startTime: '07:30', estimatedDuration: 60 },
    { id: 'route-789', name: 'Route 303 - East', schoolId: 'school-002', direction: 'PM', status: 'completed', stops: [], startTime: '15:00', estimatedDuration: 60 },
];

const mockLiveLocations: LiveLocation[] = [
    { routeId: 'route-123', vehicleId: 'bus-45', lastUpdate: new Date().toISOString(), position: { lat: 45.4220, lng: -75.6975 }, etaToNextStopMinutes: 3, deviationFlag: false, status: 'normal' },
    { routeId: 'route-456', vehicleId: 'bus-22', lastUpdate: new Date().toISOString(), position: { lat: 45.4120, lng: -75.6878 }, etaToNextStopMinutes: 5, deviationFlag: true, status: 'delay' },
];

export interface OptimizationResult {
    optimizedStops: any[];
    polyline: string;
    totalDistance: number;
    totalDuration: number;
}

export const routesApi = {
    async getActiveRoutes(): Promise<Route[]> {
        try {
            const response = await axios.get<Route[]>(`${API_BASE_URL}/api/v1/routes/active`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return mockRoutes.filter(r => r.status === 'active');
            }
            throw error;
        }
    },

    async getAllRoutes(): Promise<Route[]> {
        try {
            const response = await axios.get<Route[]>(`${API_BASE_URL}/api/v1/routes`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return mockRoutes;
            }
            throw error;
        }
    },

    async getLiveLocation(routeId: string): Promise<LiveLocation | undefined> {
        try {
            const response = await axios.get<LiveLocation>(`${API_BASE_URL}/api/v1/routes/${routeId}/live-location`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 200));
                return mockLiveLocations.find(l => l.routeId === routeId);
            }
            throw error;
        }
    },

    async getRouteHistory(routeId: string): Promise<LiveLocation[]> {
        try {
            const response = await axios.get<LiveLocation[]>(`${API_BASE_URL}/api/v1/routes/${routeId}/history`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return [];
            }
            throw error;
        }
    },

    async getAllLiveLocations(): Promise<LiveLocation[]> {
        try {
            const response = await axios.get<LiveLocation[]>(`${API_BASE_URL}/api/v1/routes/locations`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return mockLiveLocations;
            }
            throw error;
        }
    },

    async createRoute(data: any): Promise<Route> {
        const response = await axios.post<Route>(`${API_BASE_URL}/api/v1/routes`, data);
        return response.data;
    },

    async updateRoute(id: string, data: any): Promise<Route> {
        const response = await axios.patch<Route>(`${API_BASE_URL}/api/v1/routes/${id}`, data);
        return response.data;
    },

    async deleteRoute(id: string): Promise<void> {
        await axios.delete(`${API_BASE_URL}/api/v1/routes/${id}`);
    },

    async optimizeRoute(stops: any[]): Promise<OptimizationResult> {
        const response = await axios.post<OptimizationResult>(`${API_BASE_URL}/api/v1/routes/optimize`, stops);
        return response.data;
    },
};

