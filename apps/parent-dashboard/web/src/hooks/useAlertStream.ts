import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActiveAlert } from '../services/api';
import { API_BASE_URL } from '../config';

const RECONNECT_DELAY_MS = 5_000;

/**
 * Subscribes to the emergency-alerts SSE stream via the API gateway.
 * Falls back gracefully if the connection fails or the token is missing.
 * Cleans up the EventSource on unmount.
 */
export function useAlertStream(routeIds: string[]): {
  latestAlert: ActiveAlert | null;
  connected: boolean;
  error: string | null;
} {
  const [latestAlert, setLatestAlert] = useState<ActiveAlert | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const apiBase = API_BASE_URL;
    // Cookies are sent automatically via withCredentials
    const url = `${apiBase}/api/v1/parent/alerts/stream`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as Partial<ActiveAlert>;
        // Only surface alerts that match the parent's route(s)
        if (!data.routeId || routeIds.length === 0 || routeIds.includes(data.routeId)) {
          if (data.routeId) {
            setLatestAlert(data as ActiveAlert);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;
      // Schedule reconnect
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY_MS);
    };
  }, [routeIds]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { latestAlert, connected, error };
}
