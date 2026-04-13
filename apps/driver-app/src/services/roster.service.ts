import api from './api.service';
import type { Student, Stop } from '../types';

export interface RosterStudentDto {
  id: string;
  studentId?: string; // alias from presence API shape
  name?: string;
  status: 'BOARDED' | 'ALIGHTED' | 'NOT_BOARDED' | 'UNKNOWN';
  lastSeen?: string;
  stopId?: string;
  stopName?: string;
  stopSequence?: number;
  avatarUrl?: string;
}

export interface RosterStopDto {
  id: string;
  stopName: string;
  sequence: number;
  arrivalTime: string;
}

export interface RosterResponse {
  stops: Stop[];
  students: Student[];
  direction: string;
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
 * Returns students with server-confirmed presence states grouped by stops.
 * Students with no prior presence events are returned with status NOT_BOARDED.
 */
export const RosterService = {
  getRouteRoster: async (routeId: string): Promise<RosterResponse> => {
    const response = await api.get<
      | RosterStudentDto[]
      | { students: RosterStudentDto[]; stops?: RosterStopDto[]; direction?: string }
    >(`/driver/me/routes/${routeId}/students`);

    const data = response.data;

    // Handle both old array format and new wrapped format
    let rawStudents: RosterStudentDto[];
    let stops: RosterStopDto[] = [];
    let direction = 'AM';

    if (Array.isArray(data)) {
      rawStudents = data;
    } else {
      rawStudents = data.students ?? [];
      stops = data.stops ?? [];
      direction = data.direction ?? 'AM';
    }

    const students: Student[] = rawStudents.map(
      (dto): Student => ({
        id: toStudentId(dto),
        name: dto.name ?? `Student ${toStudentId(dto).slice(0, 6)}`,
        status: normaliseStatus(dto.status),
        serverConfirmed: true,
        pendingSync: false,
        stopId: dto.stopId,
        stopName: dto.stopName,
        stopSequence: dto.stopSequence,
        avatarUrl: dto.avatarUrl,
      }),
    );

    return { stops, students, direction };
  },
};
