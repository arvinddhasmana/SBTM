import type { StudentPresence } from '../../types';
import { apiClient } from './api-client';

export const presenceApi = {
    /**
     * Get students by route
     */
    async getStudentsByRoute(routeId: string): Promise<StudentPresence[]> {
        const response = await apiClient.get<{ students?: StudentPresence[] } | StudentPresence[]>(
            `/api/v1/routes/${routeId}/students`
        );
        const data = Array.isArray(response.data)
            ? response.data
            : response.data.students || [];

        return data.map((student) => ({
            ...student,
            routeId: student.routeId || routeId,
        }));
    },

    async getPresenceForRoutes(routeIds: string[]): Promise<StudentPresence[]> {
        const results = await Promise.all(routeIds.map((routeId) => this.getStudentsByRoute(routeId)));
        return results.flat();
    },

    /**
     * Get all students currently on buses
     */
    async getAllBoardedStudents(routeIds: string[]): Promise<StudentPresence[]> {
        const students = await this.getPresenceForRoutes(routeIds);
        return students.filter((student) => student.status === 'BOARDED');
    },

    /**
     * Get all presence records
     */
    async getAllPresence(routeIds: string[]): Promise<StudentPresence[]> {
        return this.getPresenceForRoutes(routeIds);
    },
};
