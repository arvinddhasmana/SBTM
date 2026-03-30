import type { AbsenceRecord } from '../../api/absence.api';

export const MOCK_ABSENCES: AbsenceRecord[] = [
    { id: 'ABS-001', studentId: 'STU-001', guardianUserId: 'usr-005', schoolId: 'SCH-001', tripDate: '2026-03-29', routeType: 'AM', notes: 'Doctor appointment', createdAt: '2026-03-28T19:00:00Z' },
    { id: 'ABS-002', studentId: 'STU-003', guardianUserId: 'usr-005', schoolId: 'SCH-001', tripDate: '2026-03-29', routeType: 'BOTH', createdAt: '2026-03-28T20:00:00Z' },
    { id: 'ABS-003', studentId: 'STU-004', guardianUserId: 'usr-005', schoolId: 'SCH-002', tripDate: '2026-03-30', routeType: 'PM', notes: 'Early pickup', createdAt: '2026-03-29T08:00:00Z' },
];
