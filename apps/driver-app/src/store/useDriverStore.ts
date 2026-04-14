import { create } from 'zustand';
import { Driver, Route, Student, Stop } from '../types';
import { AuthService } from '../services/auth.service';
import { PresenceService } from '../services/presence.service';
import { RosterService } from '../services/roster.service';
import { RouteLifecycleService } from '../services/route-lifecycle.service';

export type RosterLoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface DriverState {
  driver: Driver | null;
  isAuthenticated: boolean;
  activeRoute: Route | null;
  students: Student[];
  stops: Stop[];
  routeDirection: string;
  rosterLoadState: RosterLoadState;
  rosterError: string | null;
  isOffline: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  setActiveRoute: (route: Route) => Promise<void>;
  endRoute: () => Promise<void>;
  toggleStudentStatus: (studentId: string) => Promise<void>;
  boardAll: () => Promise<void>;
  alightAll: () => Promise<void>;
  setStudents: (students: Student[]) => void;
  refreshRoster: () => Promise<void>;
  setOffline: (offline: boolean) => void;
}

export const useDriverStore = create<DriverState>((set, get) => ({
  driver: null,
  isAuthenticated: false,
  activeRoute: null,
  students: [],
  stops: [],
  routeDirection: 'AM',
  rosterLoadState: 'idle',
  rosterError: null,
  isOffline: false,

  login: async (email, pass) => {
    const driver = await AuthService.login(email, pass);
    set({ driver, isAuthenticated: true });
  },

  logout: () => {
    AuthService.logout();
    set({
      driver: null,
      isAuthenticated: false,
      activeRoute: null,
      students: [],
      stops: [],
      routeDirection: 'AM',
      rosterLoadState: 'idle',
    });
  },

  setOffline: (offline) => set({ isOffline: offline }),

  setActiveRoute: async (route) => {
    const { driver } = get();
    set({
      activeRoute: route,
      students: [],
      stops: [],
      rosterLoadState: 'loading',
      rosterError: null,
    });

    // Record route start lifecycle event (fire-and-forget; logged on failure)
    if (driver) {
      void RouteLifecycleService.startRoute(route.id, route.vehicleId, driver.id);
    }

    // Fetch server-confirmed roster with stop data
    try {
      const { students, stops, direction } = await RosterService.getRouteRoster(route.id);
      set({ students, stops, routeDirection: direction, rosterLoadState: 'loaded' });

      // PM route: auto-board all students when starting from school
      if (direction === 'PM') {
        await get().boardAll();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load roster';
      console.warn('Roster load failed, running offline', { routeId: route.id });
      set({ rosterLoadState: 'error', rosterError: message });
    }
  },

  refreshRoster: async () => {
    const { activeRoute } = get();
    if (!activeRoute) return;

    set({ rosterLoadState: 'loading', rosterError: null });
    try {
      const { students, stops, direction } = await RosterService.getRouteRoster(activeRoute.id);
      set({ students, stops, routeDirection: direction, rosterLoadState: 'loaded' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load roster';
      set({ rosterLoadState: 'error', rosterError: message });
    }
  },

  endRoute: async () => {
    const { activeRoute, driver, routeDirection, students } = get();
    if (activeRoute && driver) {
      // AM route: auto-alight all remaining boarded students at school
      if (routeDirection === 'AM' && students.some((s) => s.status === 'BOARDED')) {
        await get().alightAll();
      }
      await RouteLifecycleService.completeRoute(activeRoute.id, activeRoute.vehicleId, driver.id);
    }
    set({
      activeRoute: null,
      students: [],
      stops: [],
      routeDirection: 'AM',
      rosterLoadState: 'idle',
      rosterError: null,
    });
  },

  setStudents: (students) => set({ students }),

  toggleStudentStatus: async (studentId: string) => {
    const { students, activeRoute, driver } = get();

    const target = students.find((s) => s.id === studentId);
    if (!target || !activeRoute || !driver) return;

    const nextStatus: Student['status'] =
      target.status === 'NOT_BOARDED'
        ? 'BOARDED'
        : target.status === 'BOARDED'
          ? 'ALIGHTED'
          : 'NOT_BOARDED';

    if (nextStatus === 'NOT_BOARDED') {
      // Cycling back to NOT_BOARDED is local-only; no backend event
      set({
        students: students.map((s) =>
          s.id === studentId ? { ...s, status: 'NOT_BOARDED', serverConfirmed: false } : s,
        ),
      });
      return;
    }

    // Optimistic update with pending sync flag
    set({
      students: students.map((s) =>
        s.id === studentId
          ? { ...s, status: nextStatus, serverConfirmed: false, pendingSync: true }
          : s,
      ),
    });

    const result = await PresenceService.sendPresenceEvent({
      studentId,
      vehicleId: activeRoute.vehicleId,
      routeId: activeRoute.id,
      schoolId: activeRoute.schoolId,
      eventType: nextStatus === 'BOARDED' ? 'BOARD' : 'ALIGHT',
      source: 'MANUAL',
      timestamp: new Date().toISOString(),
    });

    // Mark server-confirmed (or leave pendingSync:true for offline queue)
    const serverConfirmed = result.presenceEventId !== undefined;
    set({
      students: get().students.map((s) =>
        s.id === studentId ? { ...s, serverConfirmed, pendingSync: !serverConfirmed } : s,
      ),
    });
  },

  boardAll: async () => {
    const { students, activeRoute, driver } = get();
    if (!activeRoute || !driver) return;
    const notBoarded = students.filter((s) => s.status === 'NOT_BOARDED');
    if (notBoarded.length === 0) return;

    // Optimistic update
    set({
      students: students.map((s) =>
        s.status === 'NOT_BOARDED'
          ? { ...s, status: 'BOARDED' as const, serverConfirmed: false, pendingSync: true }
          : s,
      ),
    });

    const ids = notBoarded.map((s) => s.id);
    const timestamp = new Date().toISOString();
    for (const student of notBoarded) {
      await PresenceService.sendPresenceEvent({
        studentId: student.id,
        vehicleId: activeRoute.vehicleId,
        routeId: activeRoute.id,
        schoolId: activeRoute.schoolId,
        eventType: 'BOARD',
        source: 'MANUAL',
        timestamp,
      });
    }

    set({
      students: get().students.map((s) =>
        ids.includes(s.id) ? { ...s, serverConfirmed: true, pendingSync: false } : s,
      ),
    });
  },

  alightAll: async () => {
    const { students, activeRoute, driver } = get();
    if (!activeRoute || !driver) return;
    const boarded = students.filter((s) => s.status === 'BOARDED');
    if (boarded.length === 0) return;

    // Optimistic update
    set({
      students: students.map((s) =>
        s.status === 'BOARDED'
          ? { ...s, status: 'ALIGHTED' as const, serverConfirmed: false, pendingSync: true }
          : s,
      ),
    });

    const ids = boarded.map((s) => s.id);
    const timestamp = new Date().toISOString();
    for (const student of boarded) {
      await PresenceService.sendPresenceEvent({
        studentId: student.id,
        vehicleId: activeRoute.vehicleId,
        routeId: activeRoute.id,
        schoolId: activeRoute.schoolId,
        eventType: 'ALIGHT',
        source: 'MANUAL',
        timestamp,
      });
    }

    set({
      students: get().students.map((s) =>
        ids.includes(s.id) ? { ...s, serverConfirmed: true, pendingSync: false } : s,
      ),
    });
  },
}));
