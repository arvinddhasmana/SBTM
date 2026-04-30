import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Stop } from '../types';
import { haversineMeters, formatDistance } from '../utils/geo';
import type { BusStatus } from './MapMarkers';

const STATUS_FILL: Record<BusStatus, string> = {
  normal: '#22c55e',
  delay: '#eab308',
  emergency: '#ef4444',
  offline: '#94a3b8',
};

/**
 * Bus navigation marker: arrow that points along `heading` (degrees, 0=N).
 * Mirrors driver-app/src/components/map/BusNavigationMarker.tsx but supports rotation.
 */
export function BusNavigationMarker({
  status = 'normal',
  heading = 0,
}: {
  status?: BusStatus;
  heading?: number;
}) {
  const color = STATUS_FILL[status];
  return (
    <View style={navStyles.container}>
      <View style={{ transform: [{ rotate: `${heading || 0}deg` }] }}>
        <Svg width={36} height={36} viewBox="0 0 24 24">
          <Path
            d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"
            fill={color}
            stroke="white"
            strokeWidth={1}
          />
        </Svg>
      </View>
    </View>
  );
}

const navStyles = StyleSheet.create({
  container: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
});

// ── Speed Indicator ────────────────────────────────────────────────
export function SpeedIndicator({ speedMps }: { speedMps: number | null }) {
  const kph = Math.round((speedMps ?? 0) * 3.6);
  return (
    <View style={speedStyles.container} testID="speed-indicator">
      <Text style={speedStyles.value}>{kph}</Text>
      <Text style={speedStyles.unit}>km/h</Text>
    </View>
  );
}

const speedStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 200,
    left: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(10,16,35,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 20 },
  unit: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginTop: -1 },
});

// ── Next Stop Banner ──────────────────────────────────────────────
export function NextStopBanner({
  stops,
  currentLat,
  currentLng,
  direction,
  topOffset = 90,
}: {
  stops: Stop[];
  currentLat: number | null;
  currentLng: number | null;
  direction: 'AM' | 'PM';
  topOffset?: number;
}) {
  const next = useMemo(() => {
    if (currentLat == null || currentLng == null || stops.length === 0) return null;
    const sorted = [...stops]
      .filter((s) => s.lat != null && s.lng != null)
      .sort((a, b) => a.sequence - b.sequence);
    for (const stop of sorted) {
      const dist = haversineMeters(currentLat, currentLng, stop.lat, stop.lng);
      if (dist > 50) return { stop, distance: dist };
    }
    return null;
  }, [stops, currentLat, currentLng]);

  if (!next) return null;

  const accent = direction === 'AM' ? '#3b82f6' : '#f59e0b';
  // Assume ~30 km/h average for ETA
  const etaMin = Math.max(0, Math.round(next.distance / (30000 / 60)));
  const etaStr = etaMin < 1 ? '<1 min' : `${etaMin} min`;

  return (
    <View
      style={[bannerStyles.container, { borderLeftColor: accent, top: topOffset }]}
      testID="next-stop-banner"
    >
      <Text style={[bannerStyles.icon, { color: accent }]}>📍</Text>
      <View style={bannerStyles.textBlock}>
        <Text style={bannerStyles.label}>NEXT STOP</Text>
        <Text style={bannerStyles.name} numberOfLines={1}>
          {next.stop.name}
        </Text>
      </View>
      <View style={bannerStyles.metaBlock}>
        <Text style={[bannerStyles.distance, { color: accent }]}>
          {formatDistance(next.distance)}
        </Text>
        <Text style={bannerStyles.eta}>{etaStr}</Text>
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(10,16,35,0.92)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: { fontSize: 18 },
  textBlock: { flex: 1 },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  name: { fontSize: 14, fontWeight: '700', color: '#fff' },
  metaBlock: { alignItems: 'flex-end' },
  distance: { fontSize: 14, fontWeight: '800' },
  eta: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
});

// ── Route Progress Bar ────────────────────────────────────────────
export function RouteProgressBar({
  stops,
  currentLat,
  currentLng,
  direction,
}: {
  stops: Stop[];
  currentLat: number | null;
  currentLng: number | null;
  direction: 'AM' | 'PM';
}) {
  const progress = useMemo(() => {
    if (currentLat == null || currentLng == null || stops.length === 0) return 0;
    let passed = 0;
    for (const stop of stops) {
      if (stop.lat == null || stop.lng == null) continue;
      if (haversineMeters(currentLat, currentLng, stop.lat, stop.lng) < 100) passed++;
    }
    return Math.min(1, passed / stops.length);
  }, [stops, currentLat, currentLng]);

  const color = direction === 'AM' ? '#3b82f6' : '#f59e0b';
  const pct = Math.round(progress * 100);

  return (
    <View style={progressStyles.track} testID="route-progress-bar">
      <View style={[progressStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    zIndex: 100,
  },
  fill: { height: 3 },
});
