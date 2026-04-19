export const queryKeys = {
  alerts: {
    active: (routeId?: string) => ['alerts', 'active', routeId] as const,
    history: ['alerts', 'history'] as const,
    auditTrail: (alertId: string) => ['alerts', 'audit-trail', alertId] as const,
  },
  location: {
    live: (routeId: string) => ['location', 'live', routeId] as const,
  },
  route: {
    details: (routeId: string) => ['route', 'details', routeId] as const,
  },
  children: {
    all: ['children'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
} as const;
