import axios from 'axios';
import type { Route, LiveLocation } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Mock routes data for demo
const mockRoutes: Route[] = [
    {
        id: 'route-123',
        name: 'Route 101 - North',
        schoolId: 'school-001',
        direction: 'AM',
        status: 'active',
        stops: [
            { id: 'stop-1', name: 'Pine Street', position: { lat: 45.4215, lng: -75.6972 }, sequence: 1 },
            { id: 'stop-2', name: 'Oak Avenue', position: { lat: 45.4225, lng: -75.6982 }, sequence: 2 },
            { id: 'stop-3', name: 'Elm Road', position: { lat: 45.4235, lng: -75.6992 }, sequence: 3 },
        ],
    },
    {
        id: 'route-456',
        name: 'Route 202 - South',
        schoolId: 'school-001',
        direction: 'AM',
        status: 'active',
        stops: [
            { id: 'stop-4', name: 'Maple Drive', position: { lat: 45.4115, lng: -75.6872 }, sequence: 1 },
            { id: 'stop-5', name: 'Cedar Lane', position: { lat: 45.4125, lng: -75.6882 }, sequence: 2 },
        ],
    },
    {
        id: 'route-789',
        name: 'Route 303 - East',
        schoolId: 'school-002',
        direction: 'PM',
        status: 'completed',
        stops: [],
    },
];

const mockLiveLocations: LiveLocation[] = [
    {
        routeId: 'route-123',
        vehicleId: 'bus-45',
        lastUpdate: new Date().toISOString(),
        position: { lat: 45.4220, lng: -75.6975 },
        etaToNextStopMinutes: 3,
        deviationFlag: false,
        status: 'normal',
    },
    {
        routeId: 'route-456',
        vehicleId: 'bus-22',
        lastUpdate: new Date().toISOString(),
        position: { lat: 45.4120, lng: -75.6878 },
        etaToNextStopMinutes: 5,
        deviationFlag: true,
        status: 'delay',
    },
];

export const routesApi = {
    /**
     * Get all active routes
     */
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

    /**
     * Get all routes
     */
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

    /**
     * Get live location for a route
     */
    async getLiveLocation(routeId: string): Promise<LiveLocation | undefined> {
        try {
            const response = await axios.get<LiveLocation>(
                `${API_BASE_URL}/api/v1/routes/${routeId}/live-location`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 200));
                return mockLiveLocations.find(l => l.routeId === routeId);
            }
            throw error;
        }
    },

    /**
     * Get route history
     */
    async getRouteHistory(routeId: string): Promise<LiveLocation[]> {
        try {
            const response = await axios.get<LiveLocation[]>(
                `${API_BASE_URL}/api/v1/routes/${routeId}/history`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return [];
            }
            throw error;
        }
    },

    /**
     * Get all live locations
     */
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
};
