import { useState, useEffect, useCallback } from 'react';
import { parentApi, type ActiveAlert } from '../services/api';

const POLL_INTERVAL_MS = 15_000;

/**
 * Polls for active emergency alerts on the given route.
 * Returns the current alert (or null) and a manual refresh function.
 */
export function useAlerts(routeId: string | undefined) {
    const [alert, setAlert] = useState<ActiveAlert | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchAlert = useCallback(async () => {
        if (!routeId) {
            setAlert(null);
            return;
        }
        try {
            const result = await parentApi.getActiveAlert(routeId);
            setAlert(result);
            setError(null);
        } catch (err) {
            setError('Unable to fetch alert status.');
            console.error('useAlerts: failed to fetch alert for route', routeId, err);
        }
    }, [routeId]);

    useEffect(() => {
        fetchAlert();
        const timer = setInterval(fetchAlert, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [fetchAlert]);

    return { alert, error, refresh: fetchAlert };
}
