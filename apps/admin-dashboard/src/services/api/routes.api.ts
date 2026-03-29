import type { Route, LiveLocation } from '../../types';
import { apiClient } from './api-client';

export interface GeoJsonLineString {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
}

export interface OptimizationResult {
    optimizedStops: any[];
    polyline: string;
    polylineGeoJson: GeoJsonLineString | null;
    totalDistance: number;
    totalDuration: number;
}

export const routesApi = {
    async getActiveRoutes(): Promise<Route[]> {
        const response = await apiClient.get<Route[]>('/api/v1/routes/active');
        return response.data;
    },

    async getRouteById(id: string): Promise<Route> {
        const response = await apiClient.get<Route>(`/api/v1/routes/${id}`);
        return response.data;
    },

    async getAllRoutes(): Promise<Route[]> {
        // Demo stack uses reference-route IDs (ROUTE-A, ROUTE-B, ...) that also drive GPS/presence.
        // The gateway exposes these via /routes/active.
        const response = await apiClient.get<Route[]>('/api/v1/routes/active');
        return response.data;
    },

    async getLiveLocation(routeId: string): Promise<LiveLocation | undefined> {
        const response = await apiClient.get<LiveLocation>(`/api/v1/routes/${routeId}/live-location`);
        return response.data;
    },

    async getRouteHistory(routeId: string): Promise<LiveLocation[]> {
        const response = await apiClient.get<LiveLocation[]>(`/api/v1/routes/${routeId}/history`);
        return response.data;
    },

    async getAllLiveLocations(): Promise<LiveLocation[]> {
        const response = await apiClient.get<LiveLocation[]>('/api/v1/routes/locations');
        return response.data;
    },

    async createRoute(data: any): Promise<Route> {
        const response = await apiClient.post<Route>('/api/v1/routes', data);
        return response.data;
    },

    async updateRoute(id: string, data: any): Promise<Route> {
        const response = await apiClient.patch<Route>(`/api/v1/routes/${id}`, data);
        return response.data;
    },

    async deleteRoute(id: string): Promise<void> {
        await apiClient.delete(`/api/v1/routes/${id}`);
    },

    async optimizeRoute(stops: any[]): Promise<OptimizationResult> {
        const response = await apiClient.post<OptimizationResult>('/api/v1/routes/optimize', stops);
        return response.data;
    },
};

