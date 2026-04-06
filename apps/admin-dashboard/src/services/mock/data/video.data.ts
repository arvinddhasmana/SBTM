import type { VideoEvent } from '../../../types';

export const MOCK_VIDEO_EVENTS: VideoEvent[] = [
  {
    id: 'vid-001',
    routeId: 'ROUTE-SingleBus-AM',
    vehicleId: 'BUS-01',
    timestamp: new Date().toISOString(),
    eventType: 'BOARDING',
    videoUrl: '#',
    thumbnailUrl: '#',
    durationSeconds: 15,
  },
  {
    id: 'vid-002',
    routeId: 'ROUTE-SingleBus-PM',
    vehicleId: 'BUS-01',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    eventType: 'INCIDENT',
    videoUrl: '#',
    thumbnailUrl: '#',
    durationSeconds: 45,
  },
];
