// Alert Types
export type AlertEventType =
  | 'PANIC_BUTTON'
  | 'ROUTE_DEVIATION'
  | 'INCIDENT'
  | 'LATE_ARRIVAL'
  | 'ROUTE_DIVERSION'
  | 'PANIC_ALERT'
  | 'MEDICAL'
  | 'LATE_DEPARTURE'
  | 'COMPLIANCE'
  | 'OTHER';

export type AlertStatus =
  | 'ACTIVE'
  | 'RESOLVED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'AUTO_ESCALATED'
  | 'FALSE_ALARM';

export type AlertTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface AlertAuditEntry {
  id: string;
  alertId: string;
  eventType: string;
  actorUserId: string | null;
  actorRole: string | null;
  notes: string | null;
  escalationLevel: string | null;
  eventTimestamp: string;
}

export interface Alert {
  id: string;
  schoolId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  timestamp: string;
  lat: number;
  lng: number;
  eventType: AlertEventType;
  status: AlertStatus;
  description?: string;
  tier?: AlertTier;
  confirmedBy?: string;
  confirmedAt?: string;
  escalationLevel?: string;
  createdAt?: string;
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
  vehicleId?: string;
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

// Fleet Types
export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export interface Vehicle {
  id: string;
  schoolId: string;
  licensePlate: string;
  status: VehicleStatus;
}

// Route Types
export interface RouteStop {
  id: string;
  routeId: string;
  sequence: number;
  address: string;
  location: string; // WKT POINT format
}

export interface Route {
  id: string;
  name: string;
  schoolId: string;
  direction: 'AM' | 'PM';
  vehicleId?: string;
  vehicle?: Vehicle;
  startTime: string;
  estimatedDuration: number;
  stops: RouteStop[];
  status?: 'active' | 'completed' | 'scheduled';
  polyline?: string;
  path?: [number, number][];
}

// User and Auth Types
export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DRIVER'
  | 'PARENT'
  | 'OSTA_ADMIN'
  | 'BOARD_ADMIN'
  | 'SCHOOL_ADMIN';

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
