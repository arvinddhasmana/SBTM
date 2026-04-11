import type { Board, School } from '../../api/organization.api';

export const MOCK_BOARDS: Board[] = [
  {
    id: 'BRD-001',
    name: 'Ottawa-Carleton District School Board',
    schools: [{ id: 'SCH-001', name: 'Riverside Public School' }],
  },
  {
    id: 'BRD-002',
    name: 'Upper Canada District School Board',
    schools: [{ id: 'SCH-002', name: 'Kanata Academy' }],
  },
];

export const MOCK_SCHOOLS: School[] = [
  {
    id: 'SCH-001',
    name: 'Riverside Public School',
    boardId: 'BRD-001',
    location: { lat: 45.3876, lng: -75.696 },
  },
  {
    id: 'SCH-002',
    name: 'Kanata Academy',
    boardId: 'BRD-002',
    location: { lat: 45.344, lng: -75.91 },
  },
  {
    id: 'SCH-003',
    name: 'Glebe Collegiate',
    boardId: 'BRD-001',
    location: { lat: 45.396, lng: -75.688 },
  },
];
