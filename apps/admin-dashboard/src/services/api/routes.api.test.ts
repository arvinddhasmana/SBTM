import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routesApi } from './routes.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('routesApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getActiveRoutes', () => {
        it('should return active routes from API', async () => {
            const mockRoutes = [
                { id: 'route-1', name: 'Route 101', status: 'active' },
                { id: 'route-2', name: 'Route 202', status: 'active' },
            ];

            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockRoutes });

            const result = await routesApi.getActiveRoutes();

            expect(result).toEqual(mockRoutes);
            expect(apiClient.get).toHaveBeenCalledWith('/api/v1/routes/active');
        });
    });

    describe('getLiveLocation', () => {
        it('should return live location for a route', async () => {
            const mockLocation = {
                routeId: 'route-1',
                vehicleId: 'bus-1',
                position: { lat: 45.4215, lng: -75.6972 },
            };

            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockLocation });

            const result = await routesApi.getLiveLocation('route-1');

            expect(result).toEqual(mockLocation);
            expect(apiClient.get).toHaveBeenCalledWith(
                '/api/v1/routes/route-1/live-location'
            );
        });
    });

    describe('getAllLiveLocations', () => {
        it('should return all live locations', async () => {
            const mockLocations = [
                { routeId: 'route-1', vehicleId: 'bus-1' },
                { routeId: 'route-2', vehicleId: 'bus-2' },
            ];

            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockLocations });

            const result = await routesApi.getAllLiveLocations();

            expect(result).toEqual(mockLocations);
        });
    });
});
