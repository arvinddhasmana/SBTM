import { MOCK_VIDEO_EVENTS } from '../data/video.data';

export const mockVideoApi = {
    getVideoEvents: async (_filters?: { routeId?: string; eventType?: string }) => MOCK_VIDEO_EVENTS,
    getVideoEventById: async (id: string) => MOCK_VIDEO_EVENTS.find(v => v.id === id),
};
