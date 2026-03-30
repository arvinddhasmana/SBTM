import { MOCK_LOCATIONS, MOCK_ROUTES } from '../data/routes.data';

export const mockRoutesApi = {
    getAllLiveLocations: async () => MOCK_LOCATIONS,
    getActiveRoutes: async () => MOCK_ROUTES,
    getAllRoutes: async () => MOCK_ROUTES,
    getRouteById: async (id: string) => MOCK_ROUTES.find((r) => r.id === id) || MOCK_ROUTES[0],
    getLiveLocation: async (routeId: string) => MOCK_LOCATIONS.find((l) => l.routeId === routeId),
    getRouteHistory: async (routeId: string) => MOCK_LOCATIONS.filter((l) => l.routeId === routeId),
    createRoute: async (data: any) => ({ ...MOCK_ROUTES[0], ...data, id: `ROUTE-${Math.random().toString(36).substr(2, 9)}` }),
    updateRoute: async (id: string, data: any) => ({ ...MOCK_ROUTES[0], ...data, id }),
    deleteRoute: async (_id: string) => { },
    optimizeRoute: async (stops: any[]) => ({
        optimizedStops: stops,
        polyline: '',
        polylineGeoJson: null,
        totalDistance: 1000,
        totalDuration: 600,
    }),
};
