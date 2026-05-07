import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stop } from '../../types';
import { haversineMeters, formatDistance } from '../../utils/geo';

const GLASS_BG = 'rgba(15,23,42,0.75)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

// ── Speed Indicator ──────────────────────────────────────────────────
interface SpeedProps {
  speedMps: number | null;
  style?: any;
}

export function SpeedIndicator({ speedMps, style }: SpeedProps) {
  const kph = Math.round((speedMps ?? 0) * 3.6);
  return (
    <Animated.View style={[speedStyles.container, style]}>
      <Text style={speedStyles.value}>{kph}</Text>
      <Text style={speedStyles.unit}>km/h</Text>
    </Animated.View>
  );
}

const speedStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 125,
    left: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(10,16,35,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 17,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
    color: '#fff',
    lineHeight: 19,
  },
  unit: {
    fontSize: 8,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.55)',
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
  visitedStopIds: string[];
}

export function NextStopBanner({
  stops,
  currentLat,
  currentLng,
  direction,
  visitedStopIds,
}: NextStopProps) {
  const nextStop = useMemo(() => {
    if (currentLat == null || currentLng == null || stops.length === 0) return null;
    const sorted = [...stops]
      .filter((s) => s.lat != null && s.lng != null)
      .sort((a, b) => a.sequence - b.sequence);

    for (const stop of sorted) {
      if (!visitedStopIds.includes(stop.id)) {
        const dist = haversineMeters(currentLat, currentLng, stop.lat!, stop.lng!);
        return { stop, distance: dist };
      }
    }
    return null;
  }, [stops, currentLat, currentLng, visitedStopIds]);

  if (!nextStop) return null;

  const accentColor = direction === 'AM' ? '#3b82f6' : '#f59e0b';
  // Rough ETA at 30 km/h average
  const etaMin = Math.round(nextStop.distance / (30000 / 60));
  const etaStr = etaMin < 1 ? '<1 min' : `${etaMin} min`;

  return (
    <View style={[bannerStyles.container, { borderLeftColor: accentColor }]}>
      <MaterialCommunityIcons name="map-marker-right" size={18} color={accentColor} />
      <View style={bannerStyles.textBlock}>
        <Text style={bannerStyles.label}>NEXT STOP</Text>
        <Text style={bannerStyles.name} numberOfLines={1}>
          {nextStop.stop.stopName}
        </Text>
      </View>
      <View style={bannerStyles.metaBlock}>
        <Text style={[bannerStyles.distance, { color: accentColor }]}>
          {formatDistance(nextStop.distance)}
        </Text>
        <Text style={bannerStyles.eta}>{etaStr}</Text>
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 64,
    backgroundColor: 'rgba(10,16,35,0.9)',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 0,
  },
  name: {
    fontSize: 7,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  metaBlock: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
  },
  eta: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
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
