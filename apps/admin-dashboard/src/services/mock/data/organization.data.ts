import type { Board, School } from '../../api/organization.api';

export const MOCK_BOARDS: Board[] = [
    { id: 'BRD-001', name: 'Ottawa-Carleton District School Board', schools: [{ id: 'SCH-001', name: 'Riverside Public School' }] },
    { id: 'BRD-002', name: 'Upper Canada District School Board', schools: [{ id: 'SCH-002', name: 'Kanata Academy' }] },
];

export const MOCK_SCHOOLS: School[] = [
    { id: 'SCH-001', name: 'Riverside Public School', boardId: 'BRD-001' },
    { id: 'SCH-002', name: 'Kanata Academy', boardId: 'BRD-002' },
    { id: 'SCH-003', name: 'Glebe Collegiate', boardId: 'BRD-001' },
];
