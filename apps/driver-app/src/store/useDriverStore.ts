import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  visitedStopIds: string[];
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  setActiveRoute: (route: Route) => Promise<void>;
  endRoute: () => Promise<void>;
  toggleStudentStatus: (studentId: string) => Promise<void>;
  boardAll: () => Promise<void>;
  alightAll: () => Promise<void>;
  setStudents: (students: Student[]) => void;
  refreshRoster: () => Promise<void>;
  refreshSchedule: () => Promise<void>;
  setOffline: (offline: boolean) => void;
  markStopVisited: (stopId: string) => void;
  resumeRoute: () => void;
}

export const useDriverStore = create<DriverState>()(
  persist(
    (set, get) => ({
      driver: null,
      isAuthenticated: false,
      activeRoute: null,
      students: [],
      stops: [],
      routeDirection: 'AM',
      rosterLoadState: 'idle',
      rosterError: null,
      isOffline: false,
      visitedStopIds: [],

      markStopVisited: (stopId: string) =>
        set((state) => ({ visitedStopIds: [...state.visitedStopIds, stopId] })),

      resumeRoute: () => {
        // Simple action to trigger re-render if needed, but mainly used for navigating logic
      },

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
          visitedStopIds: [],
        });
      },

      setOffline: (offline) => set({ isOffline: offline }),

      refreshSchedule: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;
        try {
          const driver = await AuthService.restoreSession();
          set((state) => ({ driver: { ...driver, name: state.driver?.name ?? driver.name } }));
        } catch {
          // Network failure — keep existing schedule
        }
      },

      setActiveRoute: async (route) => {
        const { driver } = get();
        // Persisted activeRoute from earlier sessions may be missing runId/vehicleId
        // because the schedule shape grew over time. Always reconcile against the
        // freshly-fetched schedule so downstream presence calls have a valid runId.
        const fresh = driver?.assignedRoutes.find((r) => r.id === route.id);
        const reconciled: typeof route = fresh
          ? {
              ...route,
              runId: fresh.runId ?? route.runId,
              vehicleId: fresh.vehicleId || route.vehicleId,
              schoolId: fresh.schoolId || route.schoolId,
            }
          : route;
        set({
          activeRoute: reconciled,
          students: [],
          stops: [],
          rosterLoadState: 'loading',
          rosterError: null,
          visitedStopIds: [],
        });

        // Record route start lifecycle event (fire-and-forget; logged on failure)
        if (driver) {
          void RouteLifecycleService.startRoute(reconciled.id, reconciled.vehicleId, driver.id);
        }

        // Fetch server-confirmed roster with stop data
        try {
          const { students, stops, direction } = await RosterService.getRouteRoster(reconciled.id);

          // Reset students to the default state for this route direction:
          //   AM Route → all students NOT_BOARDED (driver picks them up)
          //   PM Route → first set all to NOT_BOARDED, then boardAll() transitions to BOARDED with server sync
          const resetStudents = students.map((s) => ({
            ...s,
            status: 'NOT_BOARDED' as const,
            serverConfirmed: false,
            pendingSync: false,
          }));

          set({
            students: resetStudents,
            stops,
            routeDirection: direction,
            rosterLoadState: 'loaded',
          });

          // PM route: board all students (they board at school before departure)
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
        const { activeRoute, driver, students } = get();
        if (activeRoute && driver) {
          // Auto-alight all remaining boarded students (both AM and PM)
          if (students.some((s) => s.status === 'BOARDED')) {
            await get().alightAll();
          }
          await RouteLifecycleService.completeRoute(
            activeRoute.id,
            activeRoute.vehicleId,
            driver.id,
          );
        }
        // Reset all route state back to defaults
        set({
          activeRoute: null,
          students: [],
          stops: [],
          routeDirection: 'AM',
          rosterLoadState: 'idle',
          rosterError: null,
          visitedStopIds: [],
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
          runId: activeRoute.runId ?? '',
          schoolId: activeRoute.schoolId,
          stopId: target.stopId ?? '',
          eventKind: nextStatus === 'BOARDED' ? 'boarded' : 'alighted',
          source: 'driver_app',
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
            runId: activeRoute.runId ?? '',
            schoolId: activeRoute.schoolId,
            stopId: student.stopId ?? '',
            eventKind: 'boarded',
            source: 'driver_app',
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
            runId: activeRoute.runId ?? '',
            schoolId: activeRoute.schoolId,
            stopId: student.stopId ?? '',
            eventKind: 'alighted',
            source: 'driver_app',
            timestamp,
          });
        }

        set({
          students: get().students.map((s) =>
            ids.includes(s.id) ? { ...s, serverConfirmed: true, pendingSync: false } : s,
          ),
        });
      },
    }),
    {
      name: 'driver-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeRoute: state.activeRoute,
        students: state.students,
        stops: state.stops,
        routeDirection: state.routeDirection,
        visitedStopIds: state.visitedStopIds,
        driver: state.driver,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
