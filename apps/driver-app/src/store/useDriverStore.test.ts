import { useDriverStore } from './useDriverStore';

// Mock AuthService
jest.mock('../services/auth.service', () => ({
    AuthService: {
        login: jest.fn().mockResolvedValue({
            id: 'driver-123',
            name: 'John Doe',
            email: 'driver@test.com',
            assignedRoutes: [],
        }),
        logout: jest.fn(),
    },
}));

describe('useDriverStore', () => {
    beforeEach(() => {
        // Reset store before each test
        useDriverStore.setState({
            driver: null,
            isAuthenticated: false,
            activeRoute: null,
            students: [],
        });
    });

    it('should initially be unauthenticated', () => {
        expect(useDriverStore.getState().isAuthenticated).toBe(false);
    });

    it('should login and update state', async () => {
        await useDriverStore.getState().login('driver@test.com', 'password');
        expect(useDriverStore.getState().isAuthenticated).toBe(true);
        expect(useDriverStore.getState().driver?.id).toBe('driver-123');
    });

    it('should active route and populate students', () => {
        const route = {
            id: 'r1',
            name: 'Route 1',
            schoolId: 's1',
            startTime: '2023-01-01',
            endTime: '2023-01-01',
            direction: 'AM' as const,
        };
        useDriverStore.getState().setActiveRoute(route);
        expect(useDriverStore.getState().activeRoute).toEqual(route);
        expect(useDriverStore.getState().students.length).toBeGreaterThan(0);
    });

    it('should toggle student status', () => {
        const route = {
            id: 'r1',
            name: 'Route 1',
            schoolId: 's1',
            startTime: '2023-01-01',
            endTime: '2023-01-01',
            direction: 'AM' as const,
        };
        useDriverStore.getState().setActiveRoute(route);
        const student = useDriverStore.getState().students[0];

        expect(student.status).toBe('NOT_BOARDED');

        useDriverStore.getState().toggleStudentStatus(student.id);
        expect(useDriverStore.getState().students[0].status).toBe('BOARDED');

        useDriverStore.getState().toggleStudentStatus(student.id);
        expect(useDriverStore.getState().students[0].status).toBe('ALIGHTED');
    });
});
