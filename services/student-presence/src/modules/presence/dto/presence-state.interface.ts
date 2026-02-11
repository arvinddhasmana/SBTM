
export interface StudentPresenceState {
    schoolId: string;
    studentId: string;
    status: 'BOARDED' | 'ALIGHTED';
    lastSeen: Date;
    vehicleId: string;
    routeId: string;
    signalStrength?: number;
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
    signalStrength?: number;
}
