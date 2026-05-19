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
    getRouteRoster: jest.fn().mockResolvedValue({
      students: [
        { id: 'student-a', name: 'Student A', status: 'NOT_BOARDED', serverConfirmed: true },
        { id: 'student-b', name: 'Student B', status: 'BOARDED', serverConfirmed: true },
      ],
      stops: [],
      direction: 'AM',
    }),
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

const DEFAULT_ROSTER_RESPONSE = {
  students: [
    { id: 'student-a', name: 'Student A', status: 'NOT_BOARDED' as const, serverConfirmed: true },
    { id: 'student-b', name: 'Student B', status: 'BOARDED' as const, serverConfirmed: true },
  ],
  stops: [],
  direction: 'AM',
};

const baseRoute = {
  id: 'route-test-1',
  name: 'Test Route',
  schoolId: 'school-test-1',
  vehicleId: 'vehicle-test-1',
  startTime: '2026-03-25T07:00:00Z',
  endTime: '2026-03-25T08:00:00Z',
  direction: 'AM' as const,
  schoolName: 'Greenfield Elementary',
};

const pmRoute = {
  ...baseRoute,
  id: 'route-test-pm',
  name: 'PM Test Route',
  direction: 'PM' as const,
};

function setAuthenticatedDriver() {
  useDriverStore.setState({
    driver: {
      id: 'driver-test-1',
      name: 'Test Driver',
      email: 'driver@test.com',
      assignedRoutes: [],
    },
    isAuthenticated: true,
  });
}

describe('useDriverStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default mock implementations after clearAllMocks
    mockRoster.getRouteRoster.mockResolvedValue({ ...DEFAULT_ROSTER_RESPONSE });
    mockLifecycle.startRoute.mockResolvedValue(undefined);
    mockLifecycle.completeRoute.mockResolvedValue(undefined);
    mockPresence.sendPresenceEvent.mockResolvedValue({ presenceEventId: 'evt-1' });

    useDriverStore.setState({
      driver: null,
      isAuthenticated: false,
      activeRoute: null,
      students: [],
      stops: [],
      routeDirection: 'AM',
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
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(baseRoute);

    expect(mockLifecycle.startRoute).toHaveBeenCalledWith(
      'route-test-1',
      'vehicle-test-1',
      'driver-test-1',
    );
    expect(mockRoster.getRouteRoster).toHaveBeenCalledWith('route-test-1');
    expect(useDriverStore.getState().rosterLoadState).toBe('loaded');
    expect(useDriverStore.getState().students).toHaveLength(2);
  });

  it('sets rosterLoadState to error when API fails', async () => {
    mockRoster.getRouteRoster.mockRejectedValue(new Error('Service unavailable'));
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(baseRoute);

    expect(useDriverStore.getState().rosterLoadState).toBe('error');
    expect(useDriverStore.getState().rosterError).toBe('Service unavailable');
  });

  // ─── Item 4: AM Route Start State Reset ────────────────────────────────
  it('AM route start resets ALL students to NOT_BOARDED regardless of server status', async () => {
    // Server returns mixed statuses, but AM start should reset all to NOT_BOARDED
    mockRoster.getRouteRoster.mockResolvedValue({
      students: [
        { id: 'student-a', name: 'Student A', status: 'BOARDED', serverConfirmed: true },
        { id: 'student-b', name: 'Student B', status: 'ALIGHTED', serverConfirmed: true },
        { id: 'student-c', name: 'Student C', status: 'NOT_BOARDED', serverConfirmed: true },
      ],
      stops: [],
      direction: 'AM',
    });
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(baseRoute);

    const students = useDriverStore.getState().students;
    expect(students).toHaveLength(3);
    // All should be NOT_BOARDED for AM
    expect(students.every((s) => s.status === 'NOT_BOARDED')).toBe(true);
    expect(useDriverStore.getState().routeDirection).toBe('AM');
  });

  // ─── Item 4: PM Route Start State Reset ────────────────────────────────
  it('PM route start sets ALL students to BOARDED and syncs to server', async () => {
    mockRoster.getRouteRoster.mockResolvedValue({
      students: [
        { id: 'student-a', name: 'Student A', status: 'NOT_BOARDED', serverConfirmed: true },
        { id: 'student-b', name: 'Student B', status: 'NOT_BOARDED', serverConfirmed: true },
      ],
      stops: [],
      direction: 'PM',
    });
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(pmRoute);

    const students = useDriverStore.getState().students;
    expect(students).toHaveLength(2);
    // All should be BOARDED for PM (after boardAll sync)
    expect(students.every((s) => s.status === 'BOARDED')).toBe(true);
    expect(useDriverStore.getState().routeDirection).toBe('PM');
    // boardAll should have sent BOARD events for all students
    expect(mockPresence.sendPresenceEvent).toHaveBeenCalled();
  });

  // ─── Item 5: End Route Auto-Alight for AM ──────────────────────────────
  it('endRoute auto-alights all boarded students for AM route', async () => {
    mockRoster.getRouteRoster.mockResolvedValue({
      students: [
        { id: 'student-a', name: 'Student A', status: 'NOT_BOARDED', serverConfirmed: true },
        { id: 'student-b', name: 'Student B', status: 'NOT_BOARDED', serverConfirmed: true },
      ],
      stops: [],
      direction: 'AM',
    });
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(baseRoute);
    // Manually board student-a
    await useDriverStore.getState().toggleStudentStatus('student-a');
    expect(useDriverStore.getState().students.find((s) => s.id === 'student-a')?.status).toBe(
      'BOARDED',
    );

    mockPresence.sendPresenceEvent.mockClear();
    await useDriverStore.getState().endRoute();

    // Should have sent ALIGHT event for student-a
    expect(mockPresence.sendPresenceEvent).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'student-a', eventKind: 'alighted' }),
    );
    // State should be fully reset
    expect(useDriverStore.getState().activeRoute).toBeNull();
    expect(useDriverStore.getState().students).toHaveLength(0);
    expect(useDriverStore.getState().rosterLoadState).toBe('idle');
  });

  // ─── Item 5: End Route Auto-Alight for PM (new behavior) ───────────────
  it('endRoute auto-alights all boarded students for PM route too', async () => {
    mockRoster.getRouteRoster.mockResolvedValue({
      students: [
        { id: 'student-a', name: 'Student A', status: 'NOT_BOARDED', serverConfirmed: true },
        { id: 'student-b', name: 'Student B', status: 'NOT_BOARDED', serverConfirmed: true },
      ],
      stops: [],
      direction: 'PM',
    });
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(pmRoute);
    // PM route auto-boards everyone. student-a should be BOARDED.
    expect(useDriverStore.getState().students.every((s) => s.status === 'BOARDED')).toBe(true);

    mockPresence.sendPresenceEvent.mockClear();
    await useDriverStore.getState().endRoute();

    // Should have sent ALIGHT events for both students
    expect(mockPresence.sendPresenceEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventKind: 'alighted' }),
    );
    expect(useDriverStore.getState().activeRoute).toBeNull();
    expect(useDriverStore.getState().students).toHaveLength(0);
    expect(useDriverStore.getState().routeDirection).toBe('AM');
    expect(useDriverStore.getState().rosterLoadState).toBe('idle');
    expect(useDriverStore.getState().rosterError).toBeNull();
  });

  // ─── Item 5: End Route full state reset ────────────────────────────────
  it('endRoute resets all route state including rosterError', async () => {
    setAuthenticatedDriver();
    await useDriverStore.getState().setActiveRoute(baseRoute);
    // Simulate a roster error state
    useDriverStore.setState({ rosterError: 'Previous error' });

    await useDriverStore.getState().endRoute();

    expect(useDriverStore.getState().activeRoute).toBeNull();
    expect(useDriverStore.getState().students).toHaveLength(0);
    expect(useDriverStore.getState().stops).toHaveLength(0);
    expect(useDriverStore.getState().routeDirection).toBe('AM');
    expect(useDriverStore.getState().rosterLoadState).toBe('idle');
    expect(useDriverStore.getState().rosterError).toBeNull();
  });

  it('toggleStudentStatus sends presence event with vehicleId from route (not hardcoded)', async () => {
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(baseRoute);
    const target = useDriverStore.getState().students[0];

    await useDriverStore.getState().toggleStudentStatus(target.id);

    expect(mockPresence.sendPresenceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'vehicle-test-1', // from route, not hardcoded 'bus-123'
        routeId: 'route-test-1',
        schoolId: 'school-test-1',
        eventKind: 'boarded',
        source: 'driver_app',
      }),
    );
  });

  it('toggleStudentStatus marks student as server-confirmed after successful send', async () => {
    mockPresence.sendPresenceEvent.mockResolvedValue({ presenceEventId: 'evt-confirmed' });
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(baseRoute);

    const target = useDriverStore.getState().students[0];
    await useDriverStore.getState().toggleStudentStatus(target.id);

    const updated = useDriverStore.getState().students.find((s) => s.id === target.id);
    expect(updated?.serverConfirmed).toBe(true);
    expect(updated?.pendingSync).toBe(false);
  });

  it('toggleStudentStatus marks student as pendingSync when send fails (offline queue)', async () => {
    mockPresence.sendPresenceEvent.mockResolvedValue({}); // no presenceEventId = offline-buffered
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(baseRoute);

    const target = useDriverStore.getState().students[0];
    await useDriverStore.getState().toggleStudentStatus(target.id);

    const updated = useDriverStore.getState().students.find((s) => s.id === target.id);
    expect(updated?.pendingSync).toBe(true);
    expect(updated?.serverConfirmed).toBe(false);
  });

  it('endRoute records ROUTE_COMPLETED lifecycle event and clears state', async () => {
    setAuthenticatedDriver();

    await useDriverStore.getState().setActiveRoute(baseRoute);
    await useDriverStore.getState().endRoute();

    expect(mockLifecycle.completeRoute).toHaveBeenCalledWith(
      'route-test-1',
      'vehicle-test-1',
      'driver-test-1',
    );
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
    setAuthenticatedDriver();

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
