import { MOCK_STUDENTS } from '../data/presence.data';

export const mockStudentManagementApi = {
    getStudents: async (_params?: any) => MOCK_STUDENTS.map((s, i) => ({
        id: s.studentId,
        firstName: s.name.split(' ')[0],
        lastName: s.name.split(' ')[1] || '',
        grade: `${i + 1}`,
        schoolId: 'SCH-001',
        routeId: s.routeId,
    })),
    getStudentById: async (id: string) => {
        const s = MOCK_STUDENTS.find(st => st.studentId === id) || MOCK_STUDENTS[0];
        return {
            id: s.studentId,
            firstName: s.name.split(' ')[0],
            lastName: s.name.split(' ')[1] || '',
            grade: '1',
            schoolId: 'SCH-001',
            routeId: s.routeId,
        };
    },
    enrollStudent: async (data: any) => ({ id: `STU-${Math.random().toString(36).substr(2, 6)}`, ...data }),
    updateStudent: async (id: string, data: any) => ({ id, ...data }),
    assignRoute: async (id: string, assignment: any) => ({ id, ...assignment }),
    bulkImport: async (_file: File, _schoolId: string) => ({ imported: 0, errors: [] }),
};
