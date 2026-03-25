import { apiClient } from './api-client';

export interface AbsenceRecord {
    id: string;
    studentId: string;
    guardianUserId: string;
    schoolId: string;
    tripDate: string;
    routeType: 'AM' | 'PM' | 'BOTH';
    notes?: string;
    createdAt: string;
}

export const absenceApi = {
    async listAbsences(date?: string, schoolId?: string): Promise<AbsenceRecord[]> {
        const response = await apiClient.get<AbsenceRecord[]>('/api/v1/absences/admin', {
            params: {
                ...(date ? { date } : {}),
                ...(schoolId ? { schoolId } : {}),
            },
        });
        return response.data;
    },

    async deleteAbsence(id: string): Promise<void> {
        await apiClient.delete(`/api/v1/absences/${id}`);
    },
};
