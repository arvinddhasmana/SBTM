import type { VideoEvent } from '../../../types';

export const MOCK_VIDEO_EVENTS: VideoEvent[] = [
    {
        id: 'vid-001',
        routeId: 'ROUTE-R01',
        vehicleId: 'BUS-101',
        timestamp: new Date().toISOString(),
        eventType: 'BOARDING',
        videoUrl: '#',
        thumbnailUrl: '#',
        durationSeconds: 15,
    },
    {
        id: 'vid-002',
        routeId: 'ROUTE-R12',
        vehicleId: 'BUS-205',
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        eventType: 'INCIDENT',
        videoUrl: '#',
        thumbnailUrl: '#',
        durationSeconds: 45,
    },
    {
        id: 'vid-003',
        routeId: 'ROUTE-R03',
        vehicleId: 'BUS-303',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        eventType: 'ALIGHTING',
        videoUrl: '#',
        thumbnailUrl: '#',
        durationSeconds: 12,
    },
];
