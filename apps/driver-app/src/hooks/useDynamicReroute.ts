import { useState, useEffect, useRef } from 'react';
import { LatLng } from 'react-native-maps';
import { Stop } from '../types';
import { distanceToPolyline, haversineMeters } from '../utils/geo';
import { NavigationService } from '../services/navigation.service';
import { decodePolyline } from '../utils/polyline';
import { REROUTE_INTERVAL_MS } from '../config/constants';

const DIVERSION_THRESHOLD_METERS = 50;

export function useDynamicReroute(
  currentLocation: { latitude: number; longitude: number } | null,
  routePath: LatLng[],
  stops: Stop[],
) {
  const [divertedPolyline, setDivertedPolyline] = useState<LatLng[]>([]);
  const [isDiverted, setIsDiverted] = useState(false);
  const [distFromRoute, setDistFromRoute] = useState<number>(0);

  const lastRerouteTime = useRef<number>(0);
  const lastRerouteLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    if (!currentLocation || routePath.length === 0 || stops.length === 0) {
      setIsDiverted(false);
      setDivertedPolyline([]);
      return;
    }

    const distToRoute = distanceToPolyline(
      currentLocation.latitude,
      currentLocation.longitude,
      routePath,
    );

    // Expose distance for debug overlay
    setDistFromRoute(Math.round(distToRoute));

    if (distToRoute > DIVERSION_THRESHOLD_METERS) {
      console.log(`🔀 [Reroute] DIVERTED – dist from route: ${Math.round(distToRoute)}m`);
      setIsDiverted(true);

      const now = Date.now();
      const timeSinceLast = now - lastRerouteTime.current;

      let movedEnough = false;
      if (lastRerouteLocation.current) {
        const distFromLast = haversineMeters(
          currentLocation.latitude,
          currentLocation.longitude,
          lastRerouteLocation.current.latitude,
          lastRerouteLocation.current.longitude,
        );
        movedEnough = distFromLast > 30;
        console.log(
          `🔀 [Reroute] timeSinceLast=${Math.round(timeSinceLast / 1000)}s, movedSinceLast=${Math.round(distFromLast)}m`,
        );
      } else {
        movedEnough = true; // first time
        console.log(`🔀 [Reroute] First diversion – will fetch immediately`);
      }

      if (timeSinceLast > REROUTE_INTERVAL_MS && movedEnough && !isFetching.current) {
        lastRerouteTime.current = now;
        lastRerouteLocation.current = currentLocation;
        isFetching.current = true;

        // Find next stop ahead
        const sortedStops = [...stops]
          .filter((s) => s.lat != null && s.lng != null)
          .sort((a, b) => a.sequence - b.sequence);

        let targetStop = sortedStops[sortedStops.length - 1];
        for (const stop of sortedStops) {
          const distToStop = haversineMeters(
            currentLocation.latitude,
            currentLocation.longitude,
            stop.lat!,
            stop.lng!,
          );
          if (distToStop > 50) {
            targetStop = stop;
            break;
          }
        }

        console.log(
          `🔀 [Reroute] Fetching path to stop "${targetStop?.stopName}" (seq ${targetStop?.sequence})`,
        );

        if (targetStop && targetStop.lat && targetStop.lng) {
          NavigationService.getRoutePath([
            { lat: currentLocation.latitude, lng: currentLocation.longitude },
            { lat: targetStop.lat, lng: targetStop.lng },
          ])
            .then((polyline) => {
              isFetching.current = false;
              if (polyline && polyline.length > 0) {
                const decoded = decodePolyline(polyline).map(([lat, lng]) => ({
                  latitude: lat,
                  longitude: lng,
                }));
                console.log(`✅ [Reroute] Got ${decoded.length} points for divert polyline`);
                setDivertedPolyline(decoded);
              } else {
                console.warn('⚠️ [Reroute] API returned empty polyline');
              }
            })
            .catch((err) => {
              isFetching.current = false;
              console.error('❌ [Reroute] API call failed:', err?.message ?? err);
            });
        } else {
          isFetching.current = false;
          console.warn('⚠️ [Reroute] No valid target stop found');
        }
      } else if (divertedPolyline.length === 0 && !isFetching.current) {
        // Still diverted but throttled – use last fetched polyline (kept in state)
        console.log(
          `🔀 [Reroute] Still diverted – waiting for interval (${Math.round((REROUTE_INTERVAL_MS - timeSinceLast) / 1000)}s left)`,
        );
      }
    } else {
      if (isDiverted) {
        console.log(`✅ [Reroute] Back on route – dist: ${Math.round(distToRoute)}m`);
      }
      setIsDiverted(false);
      setDivertedPolyline([]);
      lastRerouteLocation.current = null;
      lastRerouteTime.current = 0; // reset so next diversion fetches immediately
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, routePath, stops]);

  return { isDiverted, divertedPolyline, distFromRoute };
}
