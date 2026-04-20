import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stop } from '../../types';
import { haversineMeters, formatDistance } from '../../utils/geo';

const GLASS_BG = 'rgba(15,23,42,0.75)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

// ── Speed Indicator ──────────────────────────────────────────────────
interface SpeedProps {
  speedMps: number | null;
}

export function SpeedIndicator({ speedMps }: SpeedProps) {
  const kph = Math.round((speedMps ?? 0) * 3.6);
  return (
    <View style={speedStyles.container}>
      <Text style={speedStyles.value}>{kph}</Text>
      <Text style={speedStyles.unit}>km/h</Text>
    </View>
  );
}

const speedStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 20,
  },
  unit: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginTop: -1,
  },
});

// ── Next Stop Banner ─────────────────────────────────────────────────
interface NextStopProps {
  stops: Stop[];
  currentLat: number | null;
  currentLng: number | null;
  direction: string;
}

export function NextStopBanner({ stops, currentLat, currentLng, direction }: NextStopProps) {
  const nextStop = useMemo(() => {
    if (currentLat == null || currentLng == null || stops.length === 0) return null;
    const sorted = [...stops]
      .filter((s) => s.lat != null && s.lng != null)
      .sort((a, b) => a.sequence - b.sequence);
    for (const stop of sorted) {
      const dist = haversineMeters(currentLat, currentLng, stop.lat!, stop.lng!);
      if (dist > 50) {
        return { stop, distance: dist };
      }
    }
    return null;
  }, [stops, currentLat, currentLng]);

  if (!nextStop) return null;

  const accentColor = direction === 'AM' ? '#3b82f6' : '#f59e0b';

  return (
    <View style={[bannerStyles.container, { borderLeftColor: accentColor }]}>
      <Text style={bannerStyles.label}>NEXT</Text>
      <Text style={bannerStyles.name} numberOfLines={1}>
        {nextStop.stop.stopName}
      </Text>
      <Text style={[bannerStyles.distance, { color: accentColor }]}>
        {formatDistance(nextStop.distance)}
      </Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 64,
    backgroundColor: GLASS_BG,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '800',
    letterSpacing: 1,
  },
  name: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  distance: {
    fontSize: 12,
    fontWeight: '800',
  },
});

// ── Route Progress Bar ───────────────────────────────────────────────
interface ProgressProps {
  stops: Stop[];
  currentLat: number | null;
  currentLng: number | null;
  direction: string;
}

export function RouteProgressBar({ stops, currentLat, currentLng, direction }: ProgressProps) {
  const progress = useMemo(() => {
    if (currentLat == null || currentLng == null || stops.length === 0) return 0;
    let passed = 0;
    for (const stop of stops) {
      if (stop.lat == null || stop.lng == null) continue;
      if (haversineMeters(currentLat, currentLng, stop.lat, stop.lng) < 100) {
        passed++;
      }
    }
    return passed / stops.length;
  }, [stops, currentLat, currentLng]);

  const color = direction === 'AM' ? '#3b82f6' : '#f59e0b';

  return (
    <View style={progressStyles.track}>
      <View
        style={[
          progressStyles.fill,
          { width: `${Math.round(progress * 100)}%`, backgroundColor: color },
        ]}
      />
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 100,
  },
  fill: {
    height: 3,
    borderBottomRightRadius: 2,
  },
});
