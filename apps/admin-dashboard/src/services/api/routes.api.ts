import type { Route, LiveLocation } from '../../types';
import { apiClient } from './api-client';
import { decodePolyline } from '../../utils/polyline';

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

export interface SnapToRoadResult {
  polyline: string;
  polylineGeoJson: GeoJsonLineString | null;
  totalDistance: number;
  totalDuration: number;
}

const transformRoute = (route: any): Route => {
  const result: any = { ...route };
  // Flatten school relation into top-level fields for map rendering
  if (result.school) {
    result.schoolName = result.schoolName ?? result.school.name;
    result.schoolLat = result.schoolLat ?? result.school.lat;
    result.schoolLng = result.schoolLng ?? result.school.lng;
  }
  if (result.polyline && !result.path) {
    result.path = decodePolyline(result.polyline);
  }
  return result as Route;
};

export const routesApi = {
  async getActiveRoutes(): Promise<Route[]> {
    const response = await apiClient.get<Route[]>('/api/v1/routes/active');
    return (response.data || []).map(transformRoute);
  },

  async getRouteById(id: string): Promise<Route> {
    // Fallback for demo tracking script string-based IDs
    const endpoint = id.startsWith('ROUTE-')
      ? `/api/v1/routes/reference/${id}`
      : `/api/v1/routes/${id}`;
    const response = await apiClient.get<Route>(endpoint);
    return transformRoute(response.data);
  },

  async getAllRoutes(): Promise<Route[]> {
    const response = await apiClient.get<Route[]>('/api/v1/routes');
    return (response.data || []).map(transformRoute);
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
    return transformRoute(response.data);
  },

  async updateRoute(id: string, data: any): Promise<Route> {
    const response = await apiClient.patch<Route>(`/api/v1/routes/${id}`, data);
    return transformRoute(response.data);
  },

  async deleteRoute(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/routes/${id}`);
  },

  async optimizeRoute(stops: any[]): Promise<OptimizationResult> {
    const response = await apiClient.post<OptimizationResult>('/api/v1/routes/optimize', stops);
    return response.data;
  },

  async snapToRoad(waypoints: { lat: number; lng: number }[]): Promise<SnapToRoadResult> {
    const response = await apiClient.post<SnapToRoadResult>(
      '/api/v1/routes/snap-to-road',
      waypoints,
    );
    return response.data;
  },
};
