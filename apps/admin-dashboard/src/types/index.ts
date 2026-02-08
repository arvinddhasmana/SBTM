// Alert Types
export type AlertEventType = 'PANIC_BUTTON' | 'INCIDENT' | 'OTHER';
export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export interface Alert {
    id: string;
    routeId: string;
    vehicleId: string;
    timestamp: string;
    eventType: AlertEventType;
    status: AlertStatus;
    description?: string;
}

// Live Location Types
export interface Position {
    lat: number;
    lng: number;
}

export interface LiveLocation {
    routeId: string;
    vehicleId: string;
    lastUpdate: string;
    position: Position;
    etaToNextStopMinutes: number;
    deviationFlag: boolean;
    status: 'normal' | 'delay' | 'emergency';
}

// Student Presence Types
export type PresenceStatus = 'BOARDED' | 'ALIGHTED';

export interface StudentPresence {
    studentId: string;
    name: string;
    status: PresenceStatus;
    lastSeen: string;
    routeId?: string;
}

// Video Event Types
export interface VideoEvent {
    id: string;
    routeId: string;
    vehicleId: string;
    timestamp: string;
    eventType: string;
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
}

// Route Types
export interface RouteStop {
    id: string;
    name: string;
    position: Position;
    sequence: number;
    plannedArrivalTime?: string;
}

export interface Route {
    id: string;
    name: string;
    schoolId: string;
    direction: 'AM' | 'PM';
    status: 'active' | 'completed' | 'scheduled';
    stops: RouteStop[];
    currentLocation?: LiveLocation;
}

// User and Auth Types
export type UserRole = 'ADMIN' | 'DRIVER' | 'PARENT' | 'OSTA_ADMIN' | 'BOARD_ADMIN' | 'SCHOOL_ADMIN';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    schoolId?: string;
    boardId?: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
}

// Dashboard Stats
export interface DashboardStats {
    activeRoutes: number;
    totalStudents: number;
    activeAlerts: number;
    busesOnRoute: number;
}
