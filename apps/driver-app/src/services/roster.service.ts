import api from './api.service';
import type { Student } from '../types';

export interface RosterStudentDto {
    id: string;
    studentId?: string; // alias from presence API shape
    name?: string;
    status: 'BOARDED' | 'ALIGHTED' | 'NOT_BOARDED' | 'UNKNOWN';
    lastSeen?: string;
}

function normaliseStatus(raw: string): Student['status'] {
    if (raw === 'BOARDED') return 'BOARDED';
    if (raw === 'ALIGHTED') return 'ALIGHTED';
    return 'NOT_BOARDED';
}

function toStudentId(dto: RosterStudentDto): string {
    return dto.studentId ?? dto.id;
}

/**
 * Fetch the roster for a route.
 *
 * Calls GET /driver/me/routes/:routeId/students at the API Gateway.
 * Returns students with server-confirmed presence states.
 * Students with no prior presence events are returned with status NOT_BOARDED.
 */
export const RosterService = {
    getRouteRoster: async (routeId: string): Promise<Student[]> => {
        const response = await api.get<RosterStudentDto[] | { students: RosterStudentDto[] }>(
            `/driver/me/routes/${routeId}/students`,
        );

        const raw = Array.isArray(response.data)
            ? response.data
            : (response.data as { students: RosterStudentDto[] }).students ?? [];

        return raw.map((dto): Student => ({
            id: toStudentId(dto),
            name: dto.name ?? `Student ${toStudentId(dto).slice(0, 6)}`,
            status: normaliseStatus(dto.status),
            serverConfirmed: true,
            pendingSync: false,
        }));
    },
};
