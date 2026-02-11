import { describe, it, expect, vi, beforeEach } from 'vitest';
import { videoApi } from './video.api';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
    apiClient: {
        get: vi.fn(),
    },
}));

describe('videoApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getVideoEvents', () => {
        it('should return video events from API', async () => {
            const mockVideos = [
                { id: 'vid-1', eventType: 'PANIC_BUTTON' },
                { id: 'vid-2', eventType: 'INCIDENT' },
            ];

            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockVideos });

            const result = await videoApi.getVideoEvents();

            expect(result).toEqual(mockVideos);
            expect(apiClient.get).toHaveBeenCalledWith(
                '/api/v1/video-events',
                { params: undefined }
            );
        });

        it('should support filtering by route', async () => {
            const mockVideos = [{ id: 'vid-1', routeId: 'route-1' }];

            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockVideos });

            await videoApi.getVideoEvents({ routeId: 'route-1' });

            expect(apiClient.get).toHaveBeenCalledWith(
                '/api/v1/video-events',
                { params: { routeId: 'route-1' } }
            );
        });
    });

    describe('getVideoEventById', () => {
        it('should return specific video event', async () => {
            const mockVideo = { id: 'vid-1', eventType: 'PANIC_BUTTON' };

            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockVideo });

            const result = await videoApi.getVideoEventById('vid-1');

            expect(result).toEqual(mockVideo);
            expect(apiClient.get).toHaveBeenCalledWith(
                '/api/v1/video-events/vid-1'
            );
        });
    });
});
