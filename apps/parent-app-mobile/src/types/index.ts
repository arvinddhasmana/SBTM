// Core User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PARENT';
  schoolId: string;
  children?: Child[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

// Child and Student Types
export interface Child {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  schoolId: string;
  schoolName: string;
  amRouteId: string | null;
  pmRouteId: string | null;
  amRouteName?: string;
  pmRouteName?: string;
  status: ChildStatus;
  avatarUrl?: string;
  stopId?: string;
  amStopId?: string;
  pmStopId?: string;
  stopName?: string;
  vehicleId?: string;
}

export interface AlertAuditEntry {
  id: string;
  alertId: string;
  eventType: string;
  eventTimestamp: string;
  actorRole?: string;
  actorName?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export type ChildStatus = 'on_bus' | 'at_school' | 'at_home' | 'unknown';

// Route and Location Types
export interface Route {
  id: string;
  name: string;
  direction: 'AM' | 'PM';
  schoolId: string;
  schoolName?: string;
  schoolLat?: number;
  schoolLng?: number;
  vehicleId: string;
  driverId: string;
  polyline?: string;
  stops?: Stop[];
}

export interface Stop {
  id: string;
  name: string;
  sequence: number;
  lat: number;
  lng: number;
  arrivalTime?: string;
  students?: string[]; // student IDs
}

export interface BusLocationUpdate {
  vehicleId: string;
  routeId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  accuracy: number;
  timestamp: string;
  eta?: number; // seconds to next stop
  nextStopId?: string;
}

// Alert and Notification Types
export interface Alert {
  id: string;
  eventType: AlertEventType;
  vehicleId: string;
  routeId: string;
  driverId: string;
  status: AlertStatus;
  severity: AlertSeverity;
  description: string;
  lat?: number;
  lng?: number;
  timestamp: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export type AlertEventType =
  | 'PANIC_BUTTON'
  | 'LATE_ARRIVAL'
  | 'ROUTE_DEVIATION'
  | 'INCIDENT'
  | 'OTHER';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

// Notification Preferences
export interface NotificationPreferences {
  id?: string;
  userId: string;
  events: NotificationEventPreference[];
}

export interface NotificationEventPreference {
  eventType: NotificationEventType;
  channels: NotificationChannel[];
  enabled: boolean;
}

export type NotificationEventType =
  | 'CHILD_BOARDED'
  | 'CHILD_ALIGHTED'
  | 'EMERGENCY_ALERT'
  | 'BUS_APPROACHING'
  | 'ROUTE_CHANGE'
  | 'ABSENCE_CONFIRMED';

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'SMS';

// Absence Report Types
export interface AbsenceReport {
  studentId: string;
  tripDate: string; // ISO 8601 date string
  routeType: 'AM' | 'PM' | 'BOTH';
  notes?: string;
}

export interface AbsenceReportResponse {
  id: string;
  studentId: string;
  tripDate: string;
  routeType: 'AM' | 'PM' | 'BOTH';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
}

// API Response Types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Component State Types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Store Types (Zustand)
export interface ParentStore {
  // Auth State
  user: User | null;
  isAuthenticated: boolean;

  // Data State
  children: Child[];
  activeAlerts: Alert[];
  notificationPreferences: NotificationPreferences | null;
  /** Live bus locations keyed by routeId. Updated by refreshLiveLocations(). */
  routeLiveLocations: Record<string, BusLocationUpdate>;

  // Loading States
  isLoadingChildren: boolean;
  isLoadingAlerts: boolean;

  // Network State
  isOffline: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setChildren: (children: Child[]) => void;
  setActiveAlerts: (alerts: Alert[]) => void;
  setNotificationPreferences: (prefs: NotificationPreferences) => void;
  setOffline: (offline: boolean) => void;
  refreshChildren: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  refreshLiveLocations: () => Promise<void>;
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Map: { childId: string };
  Notifications: undefined;
  AbsenceReport: undefined;
  Settings: undefined;
};
