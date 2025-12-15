import axios from 'axios';
import type { VideoEvent } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Mock video events data
const mockVideoEvents: VideoEvent[] = [
    {
        id: 'vid-001',
        routeId: 'route-123',
        vehicleId: 'bus-45',
        timestamp: new Date().toISOString(),
        eventType: 'PANIC_BUTTON',
        videoUrl: 'https://storage.example.com/videos/panic-001.mp4',
        thumbnailUrl: 'https://storage.example.com/thumbs/panic-001.jpg',
        durationSeconds: 30,
    },
    {
        id: 'vid-002',
        routeId: 'route-456',
        vehicleId: 'bus-22',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        eventType: 'INCIDENT',
        videoUrl: 'https://storage.example.com/videos/incident-001.mp4',
        thumbnailUrl: 'https://storage.example.com/thumbs/incident-001.jpg',
        durationSeconds: 45,
    },
    {
        id: 'vid-003',
        routeId: 'route-789',
        vehicleId: 'bus-33',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        eventType: 'DEVIATION',
        videoUrl: 'https://storage.example.com/videos/deviation-001.mp4',
        durationSeconds: 20,
    },
];

export const videoApi = {
    /**
     * Get all video events
     */
    async getVideoEvents(filters?: { routeId?: string; eventType?: string }): Promise<VideoEvent[]> {
        try {
            const response = await axios.get<VideoEvent[]>(`${API_BASE_URL}/api/v1/video-events`, {
                params: filters,
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 300));
                let results = mockVideoEvents;
                if (filters?.routeId) {
                    results = results.filter(v => v.routeId === filters.routeId);
                }
                if (filters?.eventType) {
                    results = results.filter(v => v.eventType === filters.eventType);
                }
                return results;
            }
            throw error;
        }
    },

    /**
     * Get video event by ID
     */
    async getVideoEventById(id: string): Promise<VideoEvent | undefined> {
        try {
            const response = await axios.get<VideoEvent>(`${API_BASE_URL}/api/v1/video-events/${id}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && !error.response) {
                await new Promise(resolve => setTimeout(resolve, 200));
                return mockVideoEvents.find(v => v.id === id);
            }
            throw error;
        }
    },
};
