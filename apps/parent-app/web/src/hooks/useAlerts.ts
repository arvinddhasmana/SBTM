import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parentApi, type ActiveAlert } from '../services/api';
import { queryKeys } from '../services/query-keys';

/**
 * Monitors for active emergency alerts on the given route(s).
 * Returns ALL active alerts across all monitored routes.
 * Uses SSE as primary + TanStack Query polling as fallback.
 */
export function useAlerts(routeId: string | string[] | undefined) {
  const queryClient = useQueryClient();
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const routeIds: string[] = Array.isArray(routeId)
    ? routeId.filter(Boolean)
    : routeId
      ? [routeId]
      : [];

  const queryKey = queryKeys.alerts.active(routeIds.join(',') || undefined);

  const {
    data: alerts = [],
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<ActiveAlert[]> => {
      if (routeIds.length === 0) return [];
      const results: ActiveAlert[] = [];
      let successCount = 0;
      for (const rid of routeIds) {
        try {
          const result = await parentApi.getActiveAlert(rid);
          successCount++;
          if (result) results.push(result);
        } catch {
          // continue checking other routes
        }
      }
      if (successCount === 0) {
        throw new Error('Unable to fetch alert status for any route.');
      }
      return results;
    },
    enabled: routeIds.length > 0,
    refetchInterval: sseConnected ? false : 15_000,
  });

  const error = queryError ? 'Unable to fetch alert status.' : null;

  useEffect(() => {
    if (routeIds.length === 0) return;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    if (typeof EventSource !== 'undefined') {
      const url = `${apiBase}/api/v1/parent/alerts/stream`;
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as Partial<ActiveAlert> & { status?: string };
          if (data.routeId && routeIds.includes(data.routeId)) {
            // Invalidate and refetch on any alert event (create or resolve)
            queryClient.invalidateQueries({ queryKey });
          }
        } catch {
          // Ignore unparseable events
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        esRef.current = null;
      };
    }

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setSseConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeIds.join(','), queryClient]);

  return { alerts, error, refresh: refetch };
}
