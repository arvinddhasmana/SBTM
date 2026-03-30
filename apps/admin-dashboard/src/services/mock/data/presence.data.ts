import type { StudentPresence } from '../../../types';

export const MOCK_STUDENTS: StudentPresence[] = [
    { studentId: 'STU-001', name: 'James Wilson', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'ROUTE-R01' },
    { studentId: 'STU-002', name: 'Sarah Miller', status: 'BOARDED', lastSeen: new Date(Date.now() - 60000).toISOString(), routeId: 'ROUTE-R01' },
    { studentId: 'STU-003', name: 'Robert Chen', status: 'ALIGHTED', lastSeen: new Date(Date.now() - 300000).toISOString(), routeId: 'ROUTE-R12' },
    { studentId: 'STU-004', name: 'Emily Davis', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'ROUTE-R03' },
    { studentId: 'STU-005', name: 'Michael Brown', status: 'BOARDED', lastSeen: new Date().toISOString(), routeId: 'ROUTE-R01' },
];
