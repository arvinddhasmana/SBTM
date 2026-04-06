import { MOCK_STUDENTS } from '../data/presence.data';
import { MOCK_ROUTES } from '../data/routes.data';

export const mockPresenceApi = {
  getStats: async (_schoolId?: string) => ({
    totalStudents: 150,
    boarded: 42,
    alighted: 12,
    unknown: 96,
    byRoute: MOCK_ROUTES.map((r) => ({ routeId: r.id, boarded: 10, alighted: 5, unknown: 20 })),
  }),
  getEvents: async (_params: any) => ({
    items: MOCK_STUDENTS.map((s) => ({
      id: `evt-${s.studentId}`,
      studentId: s.studentId,
      firstName: s.name.split(' ')[0],
      lastName: s.name.split(' ')[1] || '',
      grade: '1',
      vehicleId: 'BUS-01',
      routeId: s.routeId || 'ROUTE-SingleBus-AM',
      eventType: s.status as 'BOARD' | 'ALIGHT',
      timestamp: s.lastSeen,
    })),
    total: MOCK_STUDENTS.length,
    page: 1,
    limit: 10,
  }),
  getAllBoardedStudents: async (_routeIds?: string[]) =>
    MOCK_STUDENTS.filter((s) => s.status === 'BOARDED'),
  getStudentPresence: async (id: string) =>
    MOCK_STUDENTS.find((s) => s.studentId === id) || MOCK_STUDENTS[0],
  getStudentsByRoute: async (routeId: string) => MOCK_STUDENTS.filter((s) => s.routeId === routeId),
};
