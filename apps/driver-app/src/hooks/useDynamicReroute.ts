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
  visitedStopIds: string[],
) {
  const [divertedPolyline, setDivertedPolyline] = useState<LatLng[]>([]);
  const [isDiverted, setIsDiverted] = useState(false);
  const [distFromRoute, setDistFromRoute] = useState<number>(0);

  const lastRerouteTime = useRef<number>(0);
  const lastRerouteLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastVisitedCount = useRef<number>(visitedStopIds.length);
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

    // ALWAYS SHOW ASSISTANCE TO NEXT STOP
    setIsDiverted(true);

    const now = Date.now();
    const timeSinceLast = now - lastRerouteTime.current;

    const targetChanged = visitedStopIds.length !== lastVisitedCount.current;
    if (targetChanged) {
      lastVisitedCount.current = visitedStopIds.length;
    }

    let movedEnough = false;
    if (lastRerouteLocation.current) {
      const distFromLast = haversineMeters(
        currentLocation.latitude,
        currentLocation.longitude,
        lastRerouteLocation.current.latitude,
        lastRerouteLocation.current.longitude,
      );
      movedEnough = distFromLast > 30;
    } else {
      movedEnough = true; // first time
    }

    if (
      (timeSinceLast > REROUTE_INTERVAL_MS && movedEnough && !isFetching.current) ||
      (targetChanged && !isFetching.current)
    ) {
      lastRerouteTime.current = now;
      lastRerouteLocation.current = currentLocation;
      isFetching.current = true;

      // Find next stop ahead based on visited list
      const sortedStops = [...stops]
        .filter((s) => s.lat != null && s.lng != null)
        .sort((a, b) => a.sequence - b.sequence);

      let targetStop = null;
      for (const stop of sortedStops) {
        if (!visitedStopIds.includes(stop.id)) {
          targetStop = stop;
          break;
        }
      }

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
              setDivertedPolyline(decoded);
            }
          })
          .catch((err) => {
            isFetching.current = false;
          });
      } else {
        isFetching.current = false;
        setDivertedPolyline([]);
        setIsDiverted(false); // No target stop found, disable
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, routePath, stops, visitedStopIds]);

  return { isDiverted, divertedPolyline, distFromRoute };
}
