import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useParentStore } from '../store/useParentStore';
import { ParentApiService } from '../services/ParentApiService';
import { BusLocationUpdate, Route, RootStackParamList } from '../types';
import { BUS_LOCATION_POLL_MS } from '../config/constants';
import {
  AuroraBackground,
  IconButton,
  BusMarker,
  ChildStopMarker,
  StopMarker,
  SchoolMarker,
  POLYLINE_COLORS,
  type BusStatus,
} from '../components';

type MapScreenRouteProp = RouteProp<RootStackParamList, 'Map'>;

const STALE_THRESHOLD_MS = 120_000;

export default function MapScreen() {
  const route = useRoute<MapScreenRouteProp>();
  const navigation = useNavigation();
  const { children, activeAlerts } = useParentStore();
  const mapRef = useRef<MapView>(null);

  const [child] = useState(() => children.find((c) => c.id === route.params.childId));
  const [busLocation, setBusLocation] = useState<BusLocationUpdate | null>(null);
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMapData();
    const interval = setInterval(fetchBusLocation, BUS_LOCATION_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMapData = async () => {
    try {
      if (!child) return;
      const routeId = child.amRouteId;
      if (!routeId) {
        setIsLoading(false);
        return;
      }

      const [location, details] = await Promise.all([
        ParentApiService.getLiveLocation(routeId),
        ParentApiService.getRouteDetails(routeId),
      ]);

      setBusLocation(location);
      setRouteDetails(details);

      if (details.stops && details.stops.length > 0) fitMapToRoute(details);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusLocation = async () => {
    if (!child?.amRouteId) return;
    try {
      const location = await ParentApiService.getLiveLocation(child.amRouteId);
      setBusLocation(location);
    } catch {
      /* polling — silent */
    }
  };

  const fitMapToRoute = (details: Route) => {
    if (!mapRef.current || !details.stops || details.stops.length === 0) return;
    const coordinates = details.stops.map((stop) => ({
      latitude: stop.lat,
      longitude: stop.lng,
    }));
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 100, right: 60, bottom: 240, left: 60 },
      animated: true,
    });
  };

  const recenter = () => routeDetails && fitMapToRoute(routeDetails);

  if (isLoading) {
    return (
      <AuroraBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a5b4fc" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </AuroraBackground>
    );
  }

  if (!child) {
    return (
      <AuroraBackground>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Child not found</Text>
        </View>
      </AuroraBackground>
    );
  }

  // Determine bus status
  const busAgeMs = busLocation ? Date.now() - new Date(busLocation.timestamp).getTime() : Infinity;
  const isLive = !!busLocation && busAgeMs < STALE_THRESHOLD_MS;
  const hasEmergency = activeAlerts.some(
    (a) => a.routeId === child.amRouteId && a.eventType === 'PANIC_BUTTON',
  );
  const hasDelay = activeAlerts.some(
    (a) => a.routeId === child.amRouteId && a.eventType === 'LATE_ARRIVAL',
  );
  const busStatus: BusStatus = !isLive
    ? 'offline'
    : hasEmergency
      ? 'emergency'
      : hasDelay
        ? 'delay'
        : 'normal';

  const direction = routeDetails?.direction === 'PM' ? 'PM' : 'AM';
  const polylineColor = POLYLINE_COLORS[direction];

  const stops = routeDetails?.stops ?? [];
  const lastStop = stops[stops.length - 1];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 45.4215,
          longitude: -75.6972,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {isLive && busLocation && (
          <Marker
            coordinate={{ latitude: busLocation.lat, longitude: busLocation.lng }}
            title="School Bus"
            description={`Route: ${routeDetails?.name || 'Unknown'}`}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <BusMarker status={busStatus} />
          </Marker>
        )}

        {!isLive && busLocation && (
          <Marker
            coordinate={{ latitude: busLocation.lat, longitude: busLocation.lng }}
            title="School Bus (offline)"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <BusMarker status="offline" />
          </Marker>
        )}

        {stops.map((stop, idx) => {
          const isChildStop = stop.id === child.stopId;
          const isSchool = idx === stops.length - 1;
          return (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              title={stop.name}
              description={`Stop #${stop.sequence}`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              {isSchool ? (
                <SchoolMarker />
              ) : isChildStop ? (
                <ChildStopMarker sequence={stop.sequence} />
              ) : (
                <StopMarker sequence={stop.sequence} />
              )}
            </Marker>
          );
        })}

        {stops.length > 1 && (
          <Polyline
            coordinates={stops.map((s) => ({ latitude: s.lat, longitude: s.lng }))}
            strokeColor={polylineColor}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBarLeft}>
          <IconButton icon="‹" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
          <View style={styles.childChip}>
            <Text style={styles.childChipName}>
              {child.firstName} {child.lastName}
            </Text>
            <Text style={styles.childChipMeta}>
              {routeDetails?.name ?? 'Route'} · {direction}
            </Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <IconButton icon="⊙" accessibilityLabel="Recenter" onPress={recenter} />
          <IconButton icon="↻" accessibilityLabel="Refresh" onPress={loadMapData} />
        </View>
      </SafeAreaView>

      {/* Offline banner */}
      {!isLive && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Bus signal lost · {busLocation ? 'Last known location' : 'Route not active'}
          </Text>
        </View>
      )}

      {/* Bottom info sheet */}
      <SafeAreaView style={styles.sheetWrap} edges={['bottom']} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{routeDetails?.name ?? 'Route'}</Text>
            <View style={[styles.liveBadge, !isLive && styles.offlineBadge]}>
              <View style={[styles.liveDot, !isLive && { backgroundColor: '#94a3b8' }]} />
              <Text style={styles.liveBadgeText}>{isLive ? 'Live' : 'Offline'}</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>ETA</Text>
              <Text style={styles.statBoxValue}>
                {isLive && busLocation?.eta != null
                  ? `${Math.round(busLocation.eta / 60)} min`
                  : '—'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Stops left</Text>
              <Text style={styles.statBoxValue}>{stops.length > 0 ? stops.length : '—'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Destination</Text>
              <Text style={styles.statBoxValue} numberOfLines={1}>
                {lastStop?.name ?? '—'}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#cbd5e1', fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 16 },
  map: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  childChip: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  childChipName: { color: '#f8fafc', fontWeight: '600', fontSize: 14 },
  childChipMeta: { color: '#cbd5e1', fontSize: 11, marginTop: 1 },

  offlineBanner: {
    position: 'absolute',
    top: 90,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(234,179,8,0.85)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  offlineText: { color: '#1f2937', fontWeight: '600', fontSize: 13 },

  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    margin: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
  },
  offlineBadge: {
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderColor: 'rgba(148,163,184,0.45)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveBadgeText: { color: '#f1f5f9', fontSize: 11, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statBoxLabel: { color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statBoxValue: { color: '#f8fafc', fontSize: 14, fontWeight: '600', marginTop: 2 },
});
