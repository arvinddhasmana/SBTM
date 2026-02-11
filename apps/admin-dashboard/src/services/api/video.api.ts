import type { VideoEvent } from '../../types';
import { apiClient } from './api-client';

export const videoApi = {
    /**
     * Get all video events
     */
    async getVideoEvents(filters?: { routeId?: string; eventType?: string }): Promise<VideoEvent[]> {
        const response = await apiClient.get<VideoEvent[]>('/api/v1/video-events', {
            params: filters,
        });
        return response.data;
    },

    /**
     * Get video event by ID
     */
    async getVideoEventById(id: string): Promise<VideoEvent | undefined> {
        const response = await apiClient.get<VideoEvent>(`/api/v1/video-events/${id}`);
        return response.data;
    },
};
