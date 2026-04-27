import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parentApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import type { BusLocationUpdate } from '../types';
import type { GpsLocationEvent } from './useGpsLocation.types';

/**
 * Monitors GPS location for a single route via SSE (push) with a REST polling
 * fallback. Mirrors the useAlerts.ts pattern.
 *
 * - When SSE is healthy, refetchInterval is disabled — the server pushes updates.
 * - When SSE fails or is unavailable, polling falls back to every 5 s.
 * - 404 from the REST endpoint (inactive route) is treated as null data, not an error.
 */
export function useGpsLocation(routeId: string | undefined): {
  location: BusLocationUpdate | null | undefined;
  sseConnected: boolean;
} {
  const queryClient = useQueryClient();
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const queryKey = queryKeys.location.live(routeId ?? '');

  const { data: location } = useQuery<BusLocationUpdate | null>({
    queryKey,
    queryFn: async () => {
      if (!routeId) return null;
      try {
        const data = await parentApi.getLiveLocation(routeId);
        // active: false means the gateway received a 404 from the GPS service
        // (bus hasn't started its run yet). Return null cleanly — no 404 in the
        // browser console because the gateway already responded with HTTP 200.
        if (data.active === false) return null;
        return {
          routeId: data.routeId,
          vehicleId: data.vehicleId,
          timestamp: data.lastUpdate,
          lat: data.position.lat,
          lng: data.position.lng,
          speed: 0,
          heading: 0,
          etaToNextStop: data.etaToNextStopMinutes,
          status: data.status,
        };
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } };
        // 403: session invalid or user cannot access this route — return null silently;
        //      AuthContext session validation should redirect to login if the role is wrong.
        if (err?.response?.status === 403) return null;
        throw e;
      }
    },
    enabled: !!routeId,
    refetchInterval: sseConnected ? false : 5_000,
    retry: false,
  });

  useEffect(() => {
    if (!routeId) return;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    if (typeof EventSource === 'undefined') return; // SSR / test guard

    const url = `${apiBase}/api/v1/routes/${encodeURIComponent(routeId)}/location/stream`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setSseConnected(true);
    };

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as GpsLocationEvent;
        const update: BusLocationUpdate = {
          routeId: data.routeId,
          vehicleId: data.vehicleId,
          timestamp: data.lastUpdate,
          lat: data.position.lat,
          lng: data.position.lng,
          speed: data.speedKph ?? 0,
          heading: data.headingDeg ?? 0,
          etaToNextStop: undefined,
          status: undefined,
        };
        // Push directly into the query cache — no round-trip needed
        queryClient.setQueryData<BusLocationUpdate | null>(queryKey, update);
      } catch {
        // Ignore unparseable SSE frames
      }
    };

    es.onerror = () => {
      setSseConnected(false);
      es.close();
      esRef.current = null;
      // Polling resumes automatically because sseConnected → false reactivates refetchInterval
    };

    return () => {
      esRef.current?.close();
      esRef.current = null;
      setSseConnected(false);
    };
    // queryKey is derived from routeId; re-run when routeId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, queryClient]);

  return { location: location ?? null, sseConnected };
}
