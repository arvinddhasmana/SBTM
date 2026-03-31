export const queryKeys = {
  alerts: {
    active: (routeId?: string) => ['alerts', 'active', routeId] as const,
  },
  location: {
    live: (routeId: string) => ['location', 'live', routeId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
} as const;
