import { create } from 'zustand';
import { Driver, Route, Student } from '../types';
import { AuthService } from '../services/auth.service';
import { PresenceService } from '../services/presence.service';

interface DriverState {
    driver: Driver | null;
    isAuthenticated: boolean;
    activeRoute: Route | null;
    students: Student[];
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    setActiveRoute: (route: Route) => void;
    endRoute: () => void;
    toggleStudentStatus: (studentId: string) => void;
    setStudents: (students: Student[]) => void;
}

export const useDriverStore = create<DriverState>((set, get) => ({
    driver: null,
    isAuthenticated: false,
    activeRoute: null,
    students: [],

    login: async (email, pass) => {
        const driver = await AuthService.login(email, pass);
        set({ driver, isAuthenticated: true });
    },

    logout: () => {
        AuthService.logout();
        set({ driver: null, isAuthenticated: false, activeRoute: null });
    },

    setActiveRoute: (route) => {
        set({ activeRoute: route });
        // Mock initializing students for route
        set({
            students: [
                { id: 's1', name: 'Alice Smith', status: 'NOT_BOARDED' },
                { id: 's2', name: 'Bob Jones', status: 'NOT_BOARDED' },
                { id: 's3', name: 'Charlie Day', status: 'NOT_BOARDED' },
            ]
        })
    },

    endRoute: () => {
        set({ activeRoute: null, students: [] });
    },

    setStudents: (students) => set({ students }),

    toggleStudentStatus: (studentId) => {
        const { students, activeRoute, driver } = get();
        const updated = students.map((s) => {
            if (s.id === studentId) {
                const nextStatus = s.status === 'NOT_BOARDED'
                    ? 'BOARDED'
                    : s.status === 'BOARDED'
                        ? 'ALIGHTED'
                        : 'NOT_BOARDED'; // cycle or stick to alighted? Spec says toggle. Let's cycle for test.
                return { ...s, status: nextStatus };
            }
            return s;
        });
        set({ students: updated as Student[] });

        const student = updated.find((s) => s.id === studentId);
        if (student && activeRoute && driver && (student.status === 'BOARDED' || student.status === 'ALIGHTED')) {
            // TODO: replace hardcoded vehicleId with the driver's assigned vehicle from route data
            PresenceService.sendPresenceEvent({
                studentId,
                vehicleId: 'bus-123',
                routeId: activeRoute.id,
                eventType: student.status === 'BOARDED' ? 'BOARD' : 'ALIGHT',
                source: 'MANUAL',
                timestamp: new Date().toISOString(),
            });
        }
    },
}));
