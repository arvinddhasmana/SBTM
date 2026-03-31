import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parentApi, type ActiveAlert } from '../services/api';
import { queryKeys } from '../services/query-keys';

/**
 * Monitors for active emergency alerts on the given route.
 * Uses SSE as the primary delivery mechanism and TanStack Query polling as a fallback.
 * Returns the current alert (or null) and a manual refresh function.
 */
export function useAlerts(routeId: string | undefined) {
  const queryClient = useQueryClient();
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const {
    data: alert = null,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.alerts.active(routeId),
    queryFn: async () => {
      if (!routeId) return null;
      return parentApi.getActiveAlert(routeId);
    },
    enabled: !!routeId,
    refetchInterval: sseConnected ? false : 30_000,
  });

  const error = queryError ? 'Unable to fetch alert status.' : null;

  useEffect(() => {
    if (!routeId) return;

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
          const data = JSON.parse(event.data) as Partial<ActiveAlert>;
          if (data.routeId === routeId) {
            queryClient.setQueryData(queryKeys.alerts.active(routeId), data as ActiveAlert);
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
  }, [routeId, queryClient]);

  return { alert, error, refresh: refetch };
}
