import { useDriverStore } from './useDriverStore';

// Mock AuthService
jest.mock('../services/auth.service', () => ({
    AuthService: {
        login: jest.fn().mockResolvedValue({
            id: 'driver-test-1',
            name: 'Test Driver',
            email: 'driver@test.com',
            assignedRoutes: [],
        }),
        logout: jest.fn(),
    },
}));

// Mock RosterService
jest.mock('../services/roster.service', () => ({
    RosterService: {
        getRouteRoster: jest.fn().mockResolvedValue([
            { id: 'student-a', name: 'Student A', status: 'NOT_BOARDED', serverConfirmed: true },
            { id: 'student-b', name: 'Student B', status: 'BOARDED', serverConfirmed: true },
        ]),
    },
}));

// Mock RouteLifecycleService
jest.mock('../services/route-lifecycle.service', () => ({
    RouteLifecycleService: {
        startRoute: jest.fn().mockResolvedValue(undefined),
        completeRoute: jest.fn().mockResolvedValue(undefined),
    },
}));

// Mock PresenceService
jest.mock('../services/presence.service', () => ({
    PresenceService: {
        sendPresenceEvent: jest.fn().mockResolvedValue({ presenceEventId: 'evt-1' }),
    },
}));

import { RosterService } from '../services/roster.service';
import { RouteLifecycleService } from '../services/route-lifecycle.service';
import { PresenceService } from '../services/presence.service';

const mockRoster = RosterService as jest.Mocked<typeof RosterService>;
const mockLifecycle = RouteLifecycleService as jest.Mocked<typeof RouteLifecycleService>;
const mockPresence = PresenceService as jest.Mocked<typeof PresenceService>;

const DEFAULT_STUDENTS = [
    { id: 'student-a', name: 'Student A', status: 'NOT_BOARDED' as const, serverConfirmed: true },
    { id: 'student-b', name: 'Student B', status: 'BOARDED' as const, serverConfirmed: true },
];

const baseRoute = {
    id: 'route-test-1',
    name: 'Test Route',
    schoolId: 'school-test-1',
    vehicleId: 'vehicle-test-1',
    startTime: '2026-03-25T07:00:00Z',
    endTime: '2026-03-25T08:00:00Z',
    direction: 'AM' as const,
};

describe('useDriverStore', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Restore default mock implementations after clearAllMocks
        mockRoster.getRouteRoster.mockResolvedValue([...DEFAULT_STUDENTS]);
        mockLifecycle.startRoute.mockResolvedValue(undefined);
        mockLifecycle.completeRoute.mockResolvedValue(undefined);
        mockPresence.sendPresenceEvent.mockResolvedValue({ presenceEventId: 'evt-1' });

        useDriverStore.setState({
            driver: null,
            isAuthenticated: false,
            activeRoute: null,
            students: [],
            rosterLoadState: 'idle',
            rosterError: null,
            isOffline: false,
        });
    });

    it('should initially be unauthenticated with idle roster state', () => {
        expect(useDriverStore.getState().isAuthenticated).toBe(false);
        expect(useDriverStore.getState().rosterLoadState).toBe('idle');
    });

    it('should login and update state', async () => {
        await useDriverStore.getState().login('driver@test.com', 'password');
        expect(useDriverStore.getState().isAuthenticated).toBe(true);
        expect(useDriverStore.getState().driver?.id).toBe('driver-test-1');
    });

    it('fetches roster from API on setActiveRoute and records route start lifecycle event', async () => {
        useDriverStore.setState({
            driver: { id: 'driver-test-1', name: 'Test Driver', email: 'driver@test.com', assignedRoutes: [] },
            isAuthenticated: true,
        });

        await useDriverStore.getState().setActiveRoute(baseRoute);

        expect(mockLifecycle.startRoute).toHaveBeenCalledWith('route-test-1', 'vehicle-test-1', 'driver-test-1');
        expect(mockRoster.getRouteRoster).toHaveBeenCalledWith('route-test-1');
        expect(useDriverStore.getState().rosterLoadState).toBe('loaded');
        expect(useDriverStore.getState().students).toHaveLength(2);
    });

    it('sets rosterLoadState to error when API fails', async () => {
        mockRoster.getRouteRoster.mockRejectedValue(new Error('Service unavailable'));

        await useDriverStore.getState().setActiveRoute(baseRoute);

        expect(useDriverStore.getState().rosterLoadState).toBe('error');
        expect(useDriverStore.getState().rosterError).toBe('Service unavailable');
    });

    it('toggleStudentStatus sends presence event with vehicleId from route (not hardcoded)', async () => {
        useDriverStore.setState({
            driver: { id: 'driver-test-1', name: 'Test Driver', email: 'driver@test.com', assignedRoutes: [] },
            isAuthenticated: true,
        });

        await useDriverStore.getState().setActiveRoute(baseRoute);
        const target = useDriverStore.getState().students[0];

        await useDriverStore.getState().toggleStudentStatus(target.id);

        expect(mockPresence.sendPresenceEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                vehicleId: 'vehicle-test-1',  // from route, not hardcoded 'bus-123'
                routeId: 'route-test-1',
                schoolId: 'school-test-1',
                eventType: 'BOARD',
                source: 'MANUAL',
            }),
        );
    });

    it('toggleStudentStatus marks student as server-confirmed after successful send', async () => {
        mockPresence.sendPresenceEvent.mockResolvedValue({ presenceEventId: 'evt-confirmed' });

        useDriverStore.setState({
            driver: { id: 'driver-test-1', name: 'Test Driver', email: 'driver@test.com', assignedRoutes: [] },
            isAuthenticated: true,
        });

        await useDriverStore.getState().setActiveRoute(baseRoute);

        const target = useDriverStore.getState().students[0];
        await useDriverStore.getState().toggleStudentStatus(target.id);

        const updated = useDriverStore.getState().students.find((s) => s.id === target.id);
        expect(updated?.serverConfirmed).toBe(true);
        expect(updated?.pendingSync).toBe(false);
    });

    it('toggleStudentStatus marks student as pendingSync when send fails (offline queue)', async () => {
        mockPresence.sendPresenceEvent.mockResolvedValue({}); // no presenceEventId = offline-buffered

        useDriverStore.setState({
            driver: { id: 'driver-test-1', name: 'Test Driver', email: 'driver@test.com', assignedRoutes: [] },
            isAuthenticated: true,
        });

        await useDriverStore.getState().setActiveRoute(baseRoute);

        const target = useDriverStore.getState().students[0];
        await useDriverStore.getState().toggleStudentStatus(target.id);

        const updated = useDriverStore.getState().students.find((s) => s.id === target.id);
        expect(updated?.pendingSync).toBe(true);
        expect(updated?.serverConfirmed).toBe(false);
    });

    it('endRoute records ROUTE_COMPLETED lifecycle event and clears state', async () => {
        useDriverStore.setState({
            driver: { id: 'driver-test-1', name: 'Test Driver', email: 'driver@test.com', assignedRoutes: [] },
            isAuthenticated: true,
        });

        await useDriverStore.getState().setActiveRoute(baseRoute);
        await useDriverStore.getState().endRoute();

        expect(mockLifecycle.completeRoute).toHaveBeenCalledWith('route-test-1', 'vehicle-test-1', 'driver-test-1');
        expect(useDriverStore.getState().activeRoute).toBeNull();
        expect(useDriverStore.getState().students).toHaveLength(0);
        expect(useDriverStore.getState().rosterLoadState).toBe('idle');
    });

    it('setOffline updates isOffline flag', () => {
        useDriverStore.getState().setOffline(true);
        expect(useDriverStore.getState().isOffline).toBe(true);

        useDriverStore.getState().setOffline(false);
        expect(useDriverStore.getState().isOffline).toBe(false);
    });

    it('cycling status back to NOT_BOARDED does not send a presence event', async () => {
        useDriverStore.setState({
            driver: { id: 'driver-test-1', name: 'Test Driver', email: 'driver@test.com', assignedRoutes: [] },
            isAuthenticated: true,
        });

        await useDriverStore.getState().setActiveRoute(baseRoute);

        const target = useDriverStore.getState().students[0];
        // BOARD
        await useDriverStore.getState().toggleStudentStatus(target.id);
        // ALIGHT
        await useDriverStore.getState().toggleStudentStatus(target.id);
        // back to NOT_BOARDED
        await useDriverStore.getState().toggleStudentStatus(target.id);

        // First two presses should have sent events; third should not
        expect(mockPresence.sendPresenceEvent).toHaveBeenCalledTimes(2);
    });
});
