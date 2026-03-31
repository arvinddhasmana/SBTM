export const queryKeys = {
  alerts: {
    all: ['alerts'] as const,
    active: () => [...queryKeys.alerts.all, 'active'] as const,
  },
  routes: {
    all: ['routes'] as const,
    liveLocations: () => [...queryKeys.routes.all, 'live-locations'] as const,
    active: () => [...queryKeys.routes.all, 'active'] as const,
    detail: (id: string) => [...queryKeys.routes.all, id] as const,
  },
  presence: {
    all: ['presence'] as const,
    stats: () => [...queryKeys.presence.all, 'stats'] as const,
    events: (filters: Record<string, unknown>) =>
      [...queryKeys.presence.all, 'events', filters] as const,
    boarded: (routeIds: string[]) => [...queryKeys.presence.all, 'boarded', routeIds] as const,
  },
  students: {
    all: ['students'] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
  },
  compliance: {
    all: ['compliance'] as const,
    drivers: () => [...queryKeys.compliance.all, 'drivers'] as const,
    inspections: () => [...queryKeys.compliance.all, 'inspections'] as const,
    auditLogs: () => [...queryKeys.compliance.all, 'audit-logs'] as const,
  },
  videos: {
    all: ['videos'] as const,
    events: () => [...queryKeys.videos.all, 'events'] as const,
  },
  users: {
    all: ['users'] as const,
  },
  schools: {
    all: ['schools'] as const,
    byBoard: (boardId?: string) => [...queryKeys.schools.all, boardId] as const,
  },
  boards: {
    all: ['boards'] as const,
  },
  absences: {
    all: ['absences'] as const,
    byDate: (date?: string, schoolId?: string) =>
      [...queryKeys.absences.all, date, schoolId] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
} as const;
