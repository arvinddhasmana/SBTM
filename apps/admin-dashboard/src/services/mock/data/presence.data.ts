import type { StudentPresence } from '../../../types';

export const MOCK_STUDENTS: StudentPresence[] = [
  {
    studentId: '10000000-0000-0000-0000-000000000001',
    name: 'Alice Smith',
    status: 'BOARDED',
    lastSeen: new Date().toISOString(),
    routeId: 'ROUTE-SingleBus-AM',
  },
  {
    studentId: '10000000-0000-0000-0000-000000000002',
    name: 'Bob Johnson',
    status: 'BOARDED',
    lastSeen: new Date(Date.now() - 60000).toISOString(),
    routeId: 'ROUTE-SingleBus-AM',
  },
  {
    studentId: '10000000-0000-0000-0000-000000000003',
    name: 'Charlie Brown',
    status: 'ALIGHTED',
    lastSeen: new Date(Date.now() - 300000).toISOString(),
    routeId: 'ROUTE-SingleBus-AM',
  },
  {
    studentId: '10000000-0000-0000-0000-000000000004',
    name: 'Diana Garcia',
    status: 'BOARDED',
    lastSeen: new Date().toISOString(),
    routeId: 'ROUTE-SingleBus-AM',
  },
  {
    studentId: '10000000-0000-0000-0000-000000000005',
    name: 'Ethan Wilson',
    status: 'BOARDED',
    lastSeen: new Date().toISOString(),
    routeId: 'ROUTE-SingleBus-AM',
  },
];
