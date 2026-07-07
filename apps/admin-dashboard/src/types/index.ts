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

export type AlertAuditEventType =
  | 'CREATED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'AUTO_ESCALATED'
  | 'FALSE_ALARM'
  | 'PARENT_NOTIFIED'
  | 'BOARD_ESCALATED'
  | 'STA_ESCALATED'
  | 'RESOLVED'
  | 'INFO_REQUESTED'
  | 'STATUS_UPDATE';

export interface AlertAuditEntry {
  id: string;
  alertId: string;
  eventType: AlertAuditEventType;
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
  routeName?: string;
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
  routeName?: string;
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
  /** 'school' = render via school marker, no number. 'stop' = numbered pin. */
  kind?: 'school' | 'stop';
  address: string;
  location: string | { type: string; coordinates: number[] }; // WKT POINT or GeoJSON Point
}

export interface ShapePoint {
  lat: number;
  lon: number;
  sequence: number;
  distTraveled?: number;
}

export interface Route {
  id: string;
  name: string;
  schoolId: string;
  schoolName?: string;
  schoolLat?: number;
  schoolLng?: number;
  direction: 'AM' | 'PM';
  vehicleId?: string;
  vehicleCode?: string;
  operatorCode?: string;
  tripIds?: string[];
  vehicle?: Vehicle;
  startTime: string;
  estimatedDuration: number;
  stops: RouteStop[];
  status?: 'active' | 'completed' | 'scheduled';
  path?: [number, number][];
}

// User and Auth Types
export type UserRole =
  | 'SUPER_ADMIN'
  | 'STA_ADMIN'
  | 'BOARD_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'OPERATOR_ADMIN'
  | 'DRIVER'
  | 'PARENT';

/** v2 anchor kind — must agree with the api-gateway AnchorKind union. */
export type AnchorKind = 'super' | 'sta' | 'board' | 'school' | 'operator' | 'driver' | 'parent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  anchorKind: AnchorKind | null;
  anchorId: string | null;
  preferredLanguage?: string;
}

/** Anchor-scope helpers: return the id only when the user's anchor matches the requested kind. */
export const getStaScope = (user: User | null | undefined): string | undefined =>
  user?.anchorKind === 'sta' ? (user.anchorId ?? undefined) : undefined;

export const getBoardScope = (user: User | null | undefined): string | undefined =>
  user?.anchorKind === 'board' ? (user.anchorId ?? undefined) : undefined;

export const getSchoolScope = (user: User | null | undefined): string | undefined =>
  user?.anchorKind === 'school' ? (user.anchorId ?? undefined) : undefined;

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
