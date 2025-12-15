import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routesApi } from './routes.api';

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        isAxiosError: vi.fn((error) => error.isAxiosError),
    },
}));

import axios from 'axios';

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

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockRoutes });

            const result = await routesApi.getActiveRoutes();

            expect(result).toEqual(mockRoutes);
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/v1/routes/active'));
        });

        it('should return mock routes when API unavailable', async () => {
            const networkError = { isAxiosError: true, response: undefined };
            vi.mocked(axios.get).mockRejectedValueOnce(networkError);
            vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);

            const result = await routesApi.getActiveRoutes();

            expect(result.length).toBeGreaterThan(0);
            expect(result.every((r) => r.status === 'active')).toBe(true);
        });
    });

    describe('getLiveLocation', () => {
        it('should return live location for a route', async () => {
            const mockLocation = {
                routeId: 'route-1',
                vehicleId: 'bus-1',
                position: { lat: 45.4215, lng: -75.6972 },
            };

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockLocation });

            const result = await routesApi.getLiveLocation('route-1');

            expect(result).toEqual(mockLocation);
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/routes/route-1/live-location')
            );
        });
    });

    describe('getAllLiveLocations', () => {
        it('should return all live locations', async () => {
            const mockLocations = [
                { routeId: 'route-1', vehicleId: 'bus-1' },
                { routeId: 'route-2', vehicleId: 'bus-2' },
            ];

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockLocations });

            const result = await routesApi.getAllLiveLocations();

            expect(result).toEqual(mockLocations);
        });
    });
});
