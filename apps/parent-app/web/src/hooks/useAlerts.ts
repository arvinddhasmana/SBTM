import { useState, useEffect, useCallback, useRef } from 'react';
import { parentApi, type ActiveAlert } from '../services/api';

const POLL_INTERVAL_MS = 30_000;

/**
 * Monitors for active emergency alerts on the given route.
 * Uses SSE as the primary delivery mechanism and polling as a fallback.
 * Returns the current alert (or null) and a manual refresh function.
 */
export function useAlerts(routeId: string | undefined) {
    const [alert, setAlert] = useState<ActiveAlert | null>(null);
    const [error, setError] = useState<string | null>(null);
    const esRef = useRef<EventSource | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchAlert = useCallback(async () => {
        if (!routeId) {
            setAlert(null);
            return;
        }
        try {
            const result = await parentApi.getActiveAlert(routeId);
            setAlert(result);
            setError(null);
        } catch {
            setError('Unable to fetch alert status.');
        }
    }, [routeId]);

    useEffect(() => {
        if (!routeId) {
            setAlert(null);
            return;
        }

        const token = localStorage.getItem('parent_auth_token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

        let sseConnecting = false;

        if (token && typeof EventSource !== 'undefined') {
            sseConnecting = true;
            const url = `${apiBase}/api/v1/parent/alerts/stream?token=${encodeURIComponent(token)}`;
            const es = new EventSource(url);
            esRef.current = es;

            es.onopen = () => {
                // Clear polling timer once SSE is active
                if (pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                }
            };

            es.onmessage = (event: MessageEvent<string>) => {
                try {
                    const data = JSON.parse(event.data) as Partial<ActiveAlert>;
                    if (data.routeId === routeId) {
                        setAlert(data as ActiveAlert);
                        setError(null);
                    }
                } catch {
                    // Ignore unparseable events
                }
            };

            es.onerror = () => {
                sseConnecting = false;
                es.close();
                esRef.current = null;
                // Fall back to polling
                if (!pollTimerRef.current) {
                    void fetchAlert();
                    pollTimerRef.current = setInterval(() => void fetchAlert(), POLL_INTERVAL_MS);
                }
            };
        }

        // Always do an initial fetch; polling acts as fallback if SSE unavailable
        void fetchAlert();
        if (!sseConnecting) {
            pollTimerRef.current = setInterval(() => void fetchAlert(), POLL_INTERVAL_MS);
        }

        return () => {
            if (esRef.current) {
                esRef.current.close();
                esRef.current = null;
            }
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
    }, [routeId, fetchAlert]);

    return { alert, error, refresh: fetchAlert };
}
