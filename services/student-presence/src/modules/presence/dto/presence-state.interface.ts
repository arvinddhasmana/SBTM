export interface StudentPresenceState {
  schoolId: string;
  studentId: string;
  status: 'BOARDED' | 'ALIGHTED';
  lastSeen: Date;
  vehicleId: string;
  routeId: string;
  runId: string;
  stopId: string;
}

export interface RoutePresenceResponse {
  routeId: string;
  students: StudentPresenceInfo[];
}

export interface StudentPresenceInfo {
  studentId: string;
  name?: string;
  status: 'BOARDED' | 'ALIGHTED' | 'UNKNOWN';
  lastSeen?: string;
}
