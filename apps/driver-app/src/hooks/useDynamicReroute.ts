import { useState, useEffect, useRef } from 'react';
import { LatLng } from 'react-native-maps';
import { Stop } from '../types';
import { distanceToPolyline, haversineMeters } from '../utils/geo';
import { NavigationService } from '../services/navigation.service';
import { decodePolyline } from '../utils/polyline';

const DIVERSION_THRESHOLD_METERS = 50;
const REROUTE_INTERVAL_MS = 10000;

export function useDynamicReroute(
  currentLocation: { latitude: number; longitude: number } | null,
  routePath: LatLng[],
  stops: Stop[],
) {
  const [divertedPolyline, setDivertedPolyline] = useState<LatLng[]>([]);
  const [isDiverted, setIsDiverted] = useState(false);

  const lastRerouteTime = useRef<number>(0);
  const lastRerouteLocation = useRef<{ latitude: number; longitude: number } | null>(null);

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

    if (distToRoute > DIVERSION_THRESHOLD_METERS) {
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
        movedEnough = distFromLast > 30; // only reroute if moved 30m since last reroute
      } else {
        movedEnough = true;
      }

      if (timeSinceLast > REROUTE_INTERVAL_MS && movedEnough) {
        lastRerouteTime.current = now;
        lastRerouteLocation.current = currentLocation;

        // Find next stop
        const sortedStops = [...stops]
          .filter((s) => s.lat != null && s.lng != null)
          .sort((a, b) => a.sequence - b.sequence);

        let targetStop = sortedStops[sortedStops.length - 1]; // default to last stop
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

        if (targetStop && targetStop.lat && targetStop.lng) {
          NavigationService.getRoutePath([
            { lat: currentLocation.latitude, lng: currentLocation.longitude },
            { lat: targetStop.lat, lng: targetStop.lng },
          ])
            .then((polyline) => {
              if (polyline) {
                setDivertedPolyline(
                  decodePolyline(polyline).map(([lat, lng]) => ({
                    latitude: lat,
                    longitude: lng,
                  })),
                );
              }
            })
            .catch((err) => console.warn('Reroute fetch failed', err));
        }
      }
    } else {
      setIsDiverted(false);
      setDivertedPolyline([]);
      lastRerouteLocation.current = null;
    }
  }, [currentLocation, routePath, stops]);

  return { isDiverted, divertedPolyline };
}
