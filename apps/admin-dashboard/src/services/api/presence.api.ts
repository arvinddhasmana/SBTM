import { apiClient as api } from './api-client';

export interface PresenceStats {
    totalStudents: number;
    boarded: number;
    alighted: number;
    unknown: number;
    byRoute: {
        routeId: string;
        boarded: number;
        alighted: number;
        unknown: number;
    }[];
}

export interface PresenceEvent {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    grade: string;
    vehicleId: string;
    routeId: string;
    eventType: 'BOARD' | 'ALIGHT';
    timestamp: string;
}

export interface PresenceEventsResponse {
    items: PresenceEvent[];
    total: number;
    page: number;
    limit: number;
}

export const presenceApi = {
    getStats: async (schoolId?: string): Promise<PresenceStats> =>
        api.get<PresenceStats>(`/api/v1/presence/stats${schoolId ? `?schoolId=${schoolId}` : ''}`).then((res: any) => res.data),

    getEvents: async (params: any): Promise<PresenceEventsResponse> =>
        api.get<PresenceEventsResponse>('/api/v1/presence/events', { params }).then((res: any) => res.data),

    /** 
     * Legacy support for Dashboard.tsx 
     * In the new system, this returns the current state of students by fetching stats/events 
     */
    getAllBoardedStudents: async (routeIds?: string[]): Promise<any[]> => {
        const res = await api.get<PresenceEventsResponse>('/api/v1/presence/events', {
            params: { limit: 100, eventType: 'BOARD' }
        });

        // Map PresenceEvent to StudentPresence format
        const items = res.data.items.map(item => ({
            studentId: item.studentId,
            name: `${item.firstName || 'Student'} ${item.lastName || ''}`.trim(),
            status: item.eventType === 'BOARD' ? 'BOARDED' : 'ALIGHTED',
            lastSeen: item.timestamp,
            routeId: item.routeId,
            vehicleId: item.vehicleId
        }));

        if (routeIds && routeIds.length > 0) {
            return items.filter(s => routeIds.includes(s.routeId));
        }
        return items;
    },

    getStudentsByRoute: async (routeId: string): Promise<any[]> => {
        const res = await api.get<PresenceEventsResponse>('/api/v1/presence/events', {
            params: { limit: 100, routeId }
        });

        return res.data.items.map(item => ({
            studentId: item.studentId,
            name: `${item.firstName || 'Student'} ${item.lastName || ''}`.trim(),
            status: item.eventType === 'BOARD' ? 'BOARDED' : 'ALIGHTED',
            lastSeen: item.timestamp,
            routeId: item.routeId,
            vehicleId: item.vehicleId
        }));
    }
};
