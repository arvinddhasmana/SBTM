import type { Route, LiveLocation, ShapePoint } from '../../types';
import { apiClient } from './api-client';

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat]
}

export interface OptimizationResult {
  optimizedStops: any[];
  polylineGeoJson: GeoJsonLineString | null;
  totalDistance: number;
  totalDuration: number;
}

export interface SnapToRoadResult {
  polylineGeoJson: GeoJsonLineString | null;
  totalDistance: number;
  totalDuration: number;
}

const flattenSchool = (route: any): Route => {
  const result: any = { ...route };
  if (result.school) {
    result.schoolName = result.schoolName ?? result.school.name;
    result.schoolLat = result.schoolLat ?? result.school.lat;
    result.schoolLng = result.schoolLng ?? result.school.lng;
  }
  return result as Route;
};

const shapeToPath = (shape: ShapePoint[]): [number, number][] =>
  [...shape].sort((a, b) => a.sequence - b.sequence).map((p) => [p.lat, p.lon] as [number, number]);

export const routesApi = {
  async getActiveRoutes(): Promise<Route[]> {
    const response = await apiClient.get<Route[]>('/api/v1/routes/active');
    return (response.data || []).map(flattenSchool);
  },

  async getRouteById(id: string): Promise<Route> {
    const endpoint = id.startsWith('ROUTE-')
      ? `/api/v1/routes/reference/${id}`
      : `/api/v1/routes/${id}`;
    const response = await apiClient.get<Route>(endpoint);
    const route = flattenSchool(response.data);
    try {
      const shape = await routesApi.getRouteShape(route.id);
      if (shape.length > 0) {
        route.path = shapeToPath(shape);
      }
    } catch {
      // no shape yet — leave path undefined
    }
    return route;
  },

  async getRouteShape(id: string): Promise<ShapePoint[]> {
    const response = await apiClient.get<ShapePoint[]>(`/api/v1/routes/${id}/shape`);
    return response.data || [];
  },

  async getAllRoutes(): Promise<Route[]> {
    const response = await apiClient.get<Route[]>('/api/v1/routes');
    return (response.data || []).map(flattenSchool);
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
    return flattenSchool(response.data);
  },

  async updateRoute(id: string, data: any): Promise<Route> {
    const response = await apiClient.patch<Route>(`/api/v1/routes/${id}`, data);
    return flattenSchool(response.data);
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
