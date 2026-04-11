import { MOCK_LOCATIONS, MOCK_ROUTES } from '../data/routes.data';

export const mockRoutesApi = {
  getAllLiveLocations: async () => MOCK_LOCATIONS,
  getActiveRoutes: async () => MOCK_ROUTES,
  getAllRoutes: async () => MOCK_ROUTES,
  getRouteById: async (id: string) => MOCK_ROUTES.find((r) => r.id === id) || MOCK_ROUTES[0],
  getLiveLocation: async (routeId: string) => MOCK_LOCATIONS.find((l) => l.routeId === routeId),
  getRouteHistory: async (routeId: string) => MOCK_LOCATIONS.filter((l) => l.routeId === routeId),
  createRoute: async (data: any) => ({
    ...MOCK_ROUTES[0],
    ...data,
    id: `ROUTE-${Math.random().toString(36).substr(2, 9)}`,
  }),
  updateRoute: async (id: string, data: any) => ({ ...MOCK_ROUTES[0], ...data, id }),
  deleteRoute: async (_id: string) => {},
  optimizeRoute: async (stops: any[]) => {
    const coordinates = stops
      .map((s: any) => {
        const match = (s.location || '').match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
        return match ? ([parseFloat(match[1]), parseFloat(match[2])] as [number, number]) : null;
      })
      .filter((c): c is [number, number] => c !== null);

    // Compute rough distance as sum of segments in km
    let totalDist = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      totalDist += 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    return {
      optimizedStops: stops,
      polyline: '',
      polylineGeoJson:
        coordinates.length >= 2 ? { type: 'LineString' as const, coordinates } : null,
      totalDistance: Math.round(totalDist * 10) / 10,
      totalDuration: Math.round(totalDist * 3), // ~3 min per km rough estimate
    };
  },
  snapToRoad: async (waypoints: { lat: number; lng: number }[]) => {
    // Mock: return straight-line GeoJSON through waypoints
    const coordinates = waypoints.map((w) => [w.lng, w.lat] as [number, number]);
    let totalDist = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      totalDist += 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return {
      polyline: '',
      polylineGeoJson:
        coordinates.length >= 2 ? { type: 'LineString' as const, coordinates } : null,
      totalDistance: Math.round(totalDist * 10) / 10,
      totalDuration: Math.round(totalDist * 3),
    };
  },
};
