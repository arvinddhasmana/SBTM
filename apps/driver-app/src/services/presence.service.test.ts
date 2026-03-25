import { PresenceService } from './presence.service';

jest.mock('./api.service', () => ({
    __esModule: true,
    default: {
        post: jest.fn(),
        get: jest.fn(),
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

const baseEvent = {
    studentId: 'student-test-1',
    vehicleId: 'vehicle-test-1',
    routeId: 'route-test-1',
    schoolId: 'school-test-1',
    eventType: 'BOARD' as const,
    source: 'MANUAL' as const,
    timestamp: '2026-03-25T07:30:00Z',
};

describe('PresenceService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendPresenceEvent', () => {
        it('posts to /student-presence-events and returns presenceEventId', async () => {
            mockApi.post.mockResolvedValue({ data: { presenceEventId: 'evt-success' } });

            const result = await PresenceService.sendPresenceEvent(baseEvent);

            expect(mockApi.post).toHaveBeenCalledWith(
                '/student-presence-events',
                baseEvent,
            );
            expect(result.presenceEventId).toBe('evt-success');
            expect(mockQueue.flush).toHaveBeenCalled();
        });

        it('includes schoolId in the payload (tenant isolation)', async () => {
            mockApi.post.mockResolvedValue({ data: { presenceEventId: 'evt-2' } });

            await PresenceService.sendPresenceEvent(baseEvent);

            const [, payload] = mockApi.post.mock.calls[0];
            expect((payload as typeof baseEvent).schoolId).toBe('school-test-1');
        });

        it('enqueues to offline queue on network failure', async () => {
            mockApi.post.mockRejectedValue(new Error('timeout'));

            const result = await PresenceService.sendPresenceEvent(baseEvent);

            expect(result).toEqual({});
            expect(mockQueue.enqueue).toHaveBeenCalledWith(
                'presence',
                '/student-presence-events',
                baseEvent,
            );
        });
    });

    describe('sendBleDetections', () => {
        const blePayload = {
            schoolId: 'school-test-1',
            vehicleId: 'vehicle-test-1',
            routeId: 'route-test-1',
            timestamp: '2026-03-25T07:35:00Z',
            detections: [{ tagId: 'tag-001', signalStrength: -65 }],
        };

        it('posts to /presence-events endpoint', async () => {
            mockApi.post.mockResolvedValue({ data: {} });

            await PresenceService.sendBleDetections(blePayload);

            expect(mockApi.post).toHaveBeenCalledWith('/presence-events', blePayload);
            expect(mockQueue.flush).toHaveBeenCalled();
        });

        it('enqueues to offline queue when offline', async () => {
            mockApi.post.mockRejectedValue(new Error('offline'));

            await PresenceService.sendBleDetections(blePayload);

            expect(mockQueue.enqueue).toHaveBeenCalledWith(
                'presence',
                '/presence-events',
                blePayload,
            );
        });
    });

    describe('getRouteStudents', () => {
        it('returns array from direct array response', async () => {
            mockApi.get.mockResolvedValue({
                data: [{ studentId: 'student-a', status: 'BOARDED' }],
            });

            const result = await PresenceService.getRouteStudents('route-1');

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('BOARDED');
        });

        it('returns students from wrapped response', async () => {
            mockApi.get.mockResolvedValue({
                data: { students: [{ studentId: 'student-b', status: 'ALIGHTED' }] },
            });

            const result = await PresenceService.getRouteStudents('route-2');

            expect(result[0].status).toBe('ALIGHTED');
        });
    });
});
