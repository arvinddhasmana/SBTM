import { describe, it, expect, vi, beforeEach } from 'vitest';
import { videoApi } from './video.api';

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        isAxiosError: vi.fn((error) => error.isAxiosError),
    },
}));

import axios from 'axios';

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

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockVideos });

            const result = await videoApi.getVideoEvents();

            expect(result).toEqual(mockVideos);
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/video-events'),
                { params: undefined }
            );
        });

        it('should support filtering by route', async () => {
            const mockVideos = [{ id: 'vid-1', routeId: 'route-1' }];

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockVideos });

            await videoApi.getVideoEvents({ routeId: 'route-1' });

            expect(axios.get).toHaveBeenCalledWith(
                expect.any(String),
                { params: { routeId: 'route-1' } }
            );
        });
    });

    describe('getVideoEventById', () => {
        it('should return specific video event', async () => {
            const mockVideo = { id: 'vid-1', eventType: 'PANIC_BUTTON' };

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockVideo });

            const result = await videoApi.getVideoEventById('vid-1');

            expect(result).toEqual(mockVideo);
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/video-events/vid-1')
            );
        });
    });
});
