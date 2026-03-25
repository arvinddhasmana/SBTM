import { RouteLifecycleService } from './route-lifecycle.service';

jest.mock('./api.service', () => ({
    __esModule: true,
    default: {
        post: jest.fn(),
    },
}));

jest.mock('./offline-queue.service', () => ({
    OfflineQueueService: {
        enqueue: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
    },
}));

import api from './api.service';
import { OfflineQueueService } from './offline-queue.service';

const mockApi = api as jest.Mocked<typeof api>;
const mockQueue = OfflineQueueService as jest.Mocked<typeof OfflineQueueService>;

describe('RouteLifecycleService', () => {
    const routeId = 'route-test-1';
    const vehicleId = 'vehicle-test-1';
    const driverId = 'driver-test-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('startRoute', () => {
        it('posts ROUTE_STARTED event to the lifecycle endpoint', async () => {
            mockApi.post.mockResolvedValue({ data: { status: 'recorded' } });

            await RouteLifecycleService.startRoute(routeId, vehicleId, driverId);

            expect(mockApi.post).toHaveBeenCalledWith(
                '/routes/lifecycle-events',
                expect.objectContaining({
                    routeId,
                    vehicleId,
                    driverId,
                    eventType: 'ROUTE_STARTED',
                }),
            );
        });

        it('buffers to offline queue on network failure', async () => {
            mockApi.post.mockRejectedValue(new Error('offline'));

            await RouteLifecycleService.startRoute(routeId, vehicleId, driverId);

            expect(mockQueue.enqueue).toHaveBeenCalledWith(
                'gps',
                '/routes/lifecycle-events',
                expect.objectContaining({ eventType: 'ROUTE_STARTED' }),
            );
        });
    });

    describe('completeRoute', () => {
        it('flushes offline queue then posts ROUTE_COMPLETED event', async () => {
            mockApi.post.mockResolvedValue({ data: { status: 'recorded' } });

            await RouteLifecycleService.completeRoute(routeId, vehicleId, driverId);

            expect(mockQueue.flush).toHaveBeenCalled();
            expect(mockApi.post).toHaveBeenCalledWith(
                '/routes/lifecycle-events',
                expect.objectContaining({ eventType: 'ROUTE_COMPLETED' }),
            );
        });

        it('still posts ROUTE_COMPLETED even if flush fails', async () => {
            mockQueue.flush.mockRejectedValue(new Error('flush error'));
            mockApi.post.mockResolvedValue({ data: { status: 'recorded' } });

            await RouteLifecycleService.completeRoute(routeId, vehicleId, driverId);

            expect(mockApi.post).toHaveBeenCalledWith(
                '/routes/lifecycle-events',
                expect.objectContaining({ eventType: 'ROUTE_COMPLETED' }),
            );
        });
    });
});
