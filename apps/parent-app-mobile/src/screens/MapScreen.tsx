import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useParentStore } from '../store/useParentStore';
import { ParentApiService } from '../services/ParentApiService';
import { BusLocationUpdate, Route, RootStackParamList } from '../types';
import { BUS_LOCATION_POLL_MS } from '../config/constants';
import {
  AuroraBackground,
  IconButton,
  ChildStopMarker,
  StopMarker,
  SchoolMarker,
  BusMarker,
  POLYLINE_COLORS,
  type BusStatus,
} from '../components';

type MapScreenRouteProp = RouteProp<RootStackParamList, 'Map'>;

const STALE_THRESHOLD_MS = 120_000;

const EMERGENCY_EVENT_TYPES = new Set(['PANIC_BUTTON', 'PANIC_ALERT', 'INCIDENT']);
const DELAY_EVENT_TYPES = new Set(['LATE_ARRIVAL', 'ROUTE_DEVIATION', 'ROUTE_DIVERSION']);

export default function MapScreen() {
  const { t } = useTranslation();
  const route = useRoute<MapScreenRouteProp>();
  const navigation = useNavigation();
  const { children, activeAlerts } = useParentStore();
  const mapRef = useRef<MapView>(null);

  // Re-derive child on each render so a refreshed `children` list (e.g.
  // status change after a presence event) flows into the map screen. A
  // useState snapshot froze child.status and caused PM routes to stick on
  // "Completed". Falls back to the initial snapshot if the row temporarily
  // disappears mid-render.
  const initialChildRef = useRef(children.find((c) => c.id === route.params.childId));
  const child = useMemo(
    () => children.find((c) => c.id === route.params.childId) ?? initialChildRef.current ?? null,
    [children, route.params.childId],
  );
  // Live locations polled in parallel for AM and PM routes — mirrors
  // apps/parent-dashboard/web/src/pages/Map.tsx so the active route is
  // chosen reactively rather than always defaulting to AM.
  const [amLocation, setAmLocation] = useState<BusLocationUpdate | null>(null);
  const [pmLocation, setPmLocation] = useState<BusLocationUpdate | null>(null);
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  // On Android, calling fitToCoordinates before MapView fires `onMapReady`
  // is a no-op — that's why the previous build only re-centered "after
  // some time" (when the user moved the map or polling re-triggered the
  // effect). Track readiness so the initial fit waits for the map.
  const [mapReady, setMapReady] = useState(false);

  const amRouteId = child?.amRouteId ?? null;
  const pmRouteId = child?.pmRouteId ?? null;

  const fetchAmLocation = useCallback(async () => {
    if (!amRouteId) return;
    try {
      const loc = await ParentApiService.getLiveLocation(amRouteId);
      setAmLocation(loc);
    } catch {
      /* polling — silent */
    }
  }, [amRouteId]);

  const fetchPmLocation = useCallback(async () => {
    if (!pmRouteId) return;
    try {
      const loc = await ParentApiService.getLiveLocation(pmRouteId);
      setPmLocation(loc);
    } catch {
      /* polling — silent */
    }
  }, [pmRouteId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([fetchAmLocation(), fetchPmLocation()]);
      if (!cancelled) setIsLoading(false);
    })();
    const interval = setInterval(() => {
      fetchAmLocation();
      fetchPmLocation();
    }, BUS_LOCATION_POLL_MS);
    const tick = setInterval(() => setNowMs(Date.now()), 5_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [fetchAmLocation, fetchPmLocation]);

  // Pick the freshest live route (mirrors web Map.tsx selection logic).
  const { activeRouteId, locationData } = useMemo<{
    activeRouteId: string | null;
    locationData: BusLocationUpdate | null;
  }>(() => {
    const now = nowMs;
    const amFresh =
      amLocation && now - new Date(amLocation.timestamp).getTime() < STALE_THRESHOLD_MS;
    const pmFresh =
      pmLocation && now - new Date(pmLocation.timestamp).getTime() < STALE_THRESHOLD_MS;

    if (amFresh && pmFresh) {
      const amAge = now - new Date(amLocation!.timestamp).getTime();
      const pmAge = now - new Date(pmLocation!.timestamp).getTime();
      return pmAge <= amAge
        ? { activeRouteId: pmRouteId, locationData: pmLocation! }
        : { activeRouteId: amRouteId, locationData: amLocation! };
    }
    if (pmFresh) return { activeRouteId: pmRouteId, locationData: pmLocation! };
    if (amFresh) return { activeRouteId: amRouteId, locationData: amLocation! };

    if (amLocation && pmLocation) {
      const amAge = now - new Date(amLocation.timestamp).getTime();
      const pmAge = now - new Date(pmLocation.timestamp).getTime();
      return pmAge <= amAge
        ? { activeRouteId: pmRouteId, locationData: pmLocation }
        : { activeRouteId: amRouteId, locationData: amLocation };
    }
    if (pmLocation) return { activeRouteId: pmRouteId, locationData: pmLocation };
    if (amLocation) return { activeRouteId: amRouteId, locationData: amLocation };
    return { activeRouteId: amRouteId ?? pmRouteId, locationData: null };
  }, [amLocation, pmLocation, amRouteId, pmRouteId, nowMs]);

  useEffect(() => {
    let cancelled = false;
    if (!activeRouteId) {
      setRouteDetails(null);
      return;
    }
    ParentApiService.getRouteDetails(activeRouteId)
      .then((details) => {
        if (!cancelled) setRouteDetails(details);
      })
      .catch((err) => {
        console.error('Failed to load route details:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRouteId]);

  const routePath = useMemo<{ latitude: number; longitude: number }[] | null>(() => {
    if (routeDetails?.path && routeDetails.path.length > 0) {
      return routeDetails.path.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    }
    if (routeDetails?.stops && routeDetails.stops.length > 1) {
      return routeDetails.stops.map((s) => ({ latitude: s.lat, longitude: s.lng }));
    }
    return null;
  }, [routeDetails]);

  const fitMapToRoute = useCallback(
    (
      details: Route | null,
      busLoc: BusLocationUpdate | null,
      path: { latitude: number; longitude: number }[] | null,
    ) => {
      if (!mapRef.current) return;
      const coords: { latitude: number; longitude: number }[] = [];
      if (path) coords.push(...path);
      if (details?.stops) {
        for (const s of details.stops) coords.push({ latitude: s.lat, longitude: s.lng });
      }
      if (details?.schoolLat != null && details?.schoolLng != null) {
        coords.push({ latitude: details.schoolLat, longitude: details.schoolLng });
      }
      if (busLoc) coords.push({ latitude: busLoc.lat, longitude: busLoc.lng });
      if (coords.length < 2) return;
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 120, right: 60, bottom: 240, left: 60 },
        animated: true,
      });
    },
    [],
  );

  // Fit-to-bounds on initial load OR when the active route changes.
  // Gated on `mapReady` so the very first fit lands as soon as the native
  // map is mounted on Android (previously this fired too early and nothing
  // happened until a later re-render moved the camera).
  const lastFitRouteIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mapReady) return;
    if (!routeDetails || !routePath) return;
    if (lastFitRouteIdRef.current === routeDetails.id) return;
    fitMapToRoute(routeDetails, locationData, routePath);
    lastFitRouteIdRef.current = routeDetails.id;
  }, [mapReady, routeDetails, routePath, locationData, fitMapToRoute]);

  const recenter = () => {
    if (mapRef.current && locationData) {
      mapRef.current.animateToRegion(
        {
          latitude: locationData.lat,
          longitude: locationData.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500,
      );
      return;
    }
    fitMapToRoute(routeDetails, locationData, routePath);
  };

  const handleRefresh = useCallback(() => {
    fetchAmLocation();
    fetchPmLocation();
    if (activeRouteId) {
      ParentApiService.getRouteDetails(activeRouteId)
        .then(setRouteDetails)
        .catch(() => undefined);
    }
  }, [fetchAmLocation, fetchPmLocation, activeRouteId]);

  // Hoisted derivations — must run on every render BEFORE any early returns
  // so React hook ordering stays stable across loading / loaded states.
  const childStopId = useMemo(() => {
    if (!child || !activeRouteId) return undefined;
    if (activeRouteId === child.amRouteId) return child.amStopId ?? child.stopId;
    if (activeRouteId === child.pmRouteId) return child.pmStopId ?? child.stopId;
    return child.stopId;
  }, [child, activeRouteId]);

  if (isLoading) {
    return (
      <AuroraBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a5b4fc" />
          <Text style={styles.loadingText}>{t('tracking.loadingMap')}</Text>
        </View>
      </AuroraBackground>
    );
  }

  if (!child) {
    return (
      <AuroraBackground>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{t('tracking.childNotFound')}</Text>
        </View>
      </AuroraBackground>
    );
  }

  const busAgeMs = locationData
    ? Date.now() - new Date(locationData.timestamp).getTime()
    : Infinity;
  const isLive = !!locationData && busAgeMs < STALE_THRESHOLD_MS;

  const matchingAlerts = activeAlerts.filter(
    (a) =>
      a.routeId === activeRouteId ||
      'Unknown Route' === child.amRouteId ||
      'Unknown Route' === child.pmRouteId,
  );
  const hasEmergency = matchingAlerts.some((a) => EMERGENCY_EVENT_TYPES.has(a.eventType));
  const hasDelay = matchingAlerts.some((a) => DELAY_EVENT_TYPES.has(a.eventType));
  const busStatus: BusStatus = !isLive
    ? 'offline'
    : hasEmergency
      ? 'emergency'
      : hasDelay
        ? 'delay'
        : 'normal';
  const statusLabel =
    busStatus === 'normal'
      ? t('tracking.statuses.normal')
      : busStatus === 'delay'
        ? t('tracking.statuses.delayed')
        : busStatus === 'emergency'
          ? t('tracking.statuses.emergency')
          : t('tracking.statuses.offline');

  const direction: 'AM' | 'PM' =
    routeDetails?.direction === 'PM'
      ? 'PM'
      : routeDetails?.direction === 'AM'
        ? 'AM'
        : activeRouteId && activeRouteId === child.pmRouteId
          ? 'PM'
          : 'AM';
  const polylineColor = POLYLINE_COLORS[direction];

  const stops = routeDetails?.stops ?? [];

  // Route status — a live, fresh GPS signal always wins over the cached
  // presence flag so an actively running PM bus never displays "Completed".
  // Falls back to presence (at_home / at_school) only when GPS is absent.
  // Separate raw status key for conditional styling/logic
  const routeStatusKey = (() => {
    if (isLive) return 'live';
    const isPM = activeRouteId === child.pmRouteId;
    const isAM = activeRouteId === child.amRouteId;
    if (isPM && child.status === 'at_home') return 'completed';
    if (isAM && child.status === 'at_school') return 'completed';
    if (locationData) return 'noSignal';
    return 'inactive';
  })();
  const routeStatusLabel = (() => {
    if (isLive) return t('tracking.statuses.live');
    const isPM = activeRouteId === child.pmRouteId;
    const isAM = activeRouteId === child.amRouteId;
    if (isPM && child.status === 'at_home') return t('tracking.statuses.completed');
    if (isAM && child.status === 'at_school') return t('tracking.statuses.completed');
    if (locationData) return t('tracking.statuses.noSignal');
    return t('tracking.statuses.inactive');
  })();

  const childFullName = `${child.firstName} ${child.lastName}`.trim();
  const routeName = routeDetails?.name ?? activeRouteId ?? 'Route';
  const vehicleId = routeDetails?.vehicleId || child.vehicleId || t('tracking.map.notAvailable');
  const etaMinutes =
    isLive && locationData?.eta != null ? Math.max(0, Math.round(locationData.eta / 60)) : null;
  const updatedAt = locationData?.timestamp ? new Date(locationData.timestamp) : null;

  return (
    <View style={styles.container} testID="map-screen">
      <MapView
        ref={mapRef}
        style={styles.map}
        onMapReady={() => setMapReady(true)}
        initialRegion={{
          latitude: 45.4215,
          longitude: -75.6972,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {routePath && routePath.length > 1 && (
          <Polyline coordinates={routePath} strokeColor={polylineColor} strokeWidth={5} />
        )}

        {stops.map((stop) => {
          if (stop.kind === 'school') return null;
          const isChildStop = stop.id === childStopId;
          return (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              title={stop.name}
              description={`Stop #${stop.sequence}`}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={isChildStop ? 500 : 1}
            >
              {isChildStop ? (
                <ChildStopMarker sequence={stop.sequence} />
              ) : (
                <StopMarker sequence={stop.sequence} />
              )}
            </Marker>
          );
        })}

        {/* School marker — uses school coordinates from the route reference,
            NOT the last stop (that produced the wrong-location bug). */}
        {routeDetails?.schoolLat != null && routeDetails?.schoolLng != null && (
          <Marker
            coordinate={{ latitude: routeDetails.schoolLat, longitude: routeDetails.schoolLng }}
            title={routeDetails.schoolName ?? child.schoolName ?? 'School'}
            description="School"
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={600}
          >
            <SchoolMarker sequence={stops.find((s) => s.kind === 'school')?.sequence} />
          </Marker>
        )}

        {locationData && isLive && (
          <Marker
            coordinate={{ latitude: locationData.lat, longitude: locationData.lng }}
            title={`Bus ${locationData.vehicleId}`}
            description={`Status: ${statusLabel}`}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={700}
          >
            <BusMarker status={busStatus} />
          </Marker>
        )}
      </MapView>

      {/* Top bar — back button (testID required by E2E) + recenter / refresh.
          The previous implementation had a child-name chip and a NEXT STOP
          banner; per parity request both have been removed so the map matches
          the web portal layout (only side controls + bottom info card). */}
      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBarLeft}>
          <IconButton
            icon="❮"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            testID="map-back"
            style={styles.backBtnDark}
          />
        </View>
        <View style={styles.topBarRight}>
          <Pressable
            onPress={recenter}
            accessibilityRole="button"
            accessibilityLabel="Map Reset"
            testID="map-reset"
            style={styles.mapResetBtn}
          >
            <Text style={styles.mapResetIcon}>⌖</Text>
            <Text style={styles.mapResetText}>{t('tracking.map.mapReset').toUpperCase()}</Text>
          </Pressable>
          <IconButton icon="↻" accessibilityLabel="Refresh" onPress={handleRefresh} />
        </View>
      </SafeAreaView>

      {/* Bottom collapsible info panel — mirrors web Map.tsx status panel.
          Heading = student name. Fields: Route (direction), Vehicle, ETA + Updated.
          Plus delay/emergency badge when applicable. No extras. */}
      <SafeAreaView style={styles.sheetWrap} edges={['bottom']} pointerEvents="box-none">
        <Pressable
          style={styles.sheet}
          onPress={() => setSheetExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={sheetExpanded ? 'Collapse details' : 'Expand details'}
          testID="map-bottom-sheet"
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {childFullName || 'Student'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                routeStatusKey === 'live'
                  ? styles.statusBadgeLive
                  : routeStatusKey === 'noSignal'
                    ? styles.statusBadgeNoSignal
                    : styles.statusBadgeIdle,
              ]}
            >
              <Text style={styles.statusBadgeText}>{routeStatusLabel}</Text>
            </View>
          </View>

          {/* Active alert chip — always visible (collapsed AND expanded) so
              the parent sees the bus status at a glance, mirroring the web
              portal's persistent "Delayed: LATE ARRIVAL" pill. The bus icon
              on the map is also color-coded via `busStatus`. */}
          {matchingAlerts.length > 0 && (
            <View
              style={[
                styles.alertChip,
                busStatus === 'emergency' ? styles.alertChipEmergency : styles.alertChipDelay,
              ]}
              testID="map-alert-chip"
            >
              <Text style={styles.alertChipText}>
                {statusLabel}:{' '}
                {matchingAlerts.map((a) => a.eventType.replace(/_/g, ' ')).join(', ')}
              </Text>
            </View>
          )}

          {/* Collapsed state shows ONLY the student name + status badge +
              alert chip plus the tap-to-expand hint. Everything else is
              hidden until the user taps the panel to expand it. */}
          {sheetExpanded && (
            <>
              <Text style={styles.sheetLine}>
                {t('tracking.map.route')}
                <Text style={styles.sheetLineStrong}>{routeName}</Text> (
                {t(`tracking.map.${direction.toLowerCase()}`)})
              </Text>
              <Text style={styles.sheetLineMuted}>
                {t('tracking.map.vehicle')}
                {vehicleId}
              </Text>

              {isLive && locationData && (
                <View style={styles.sheetEtaRow}>
                  <Text style={styles.sheetEtaText}>
                    {t('tracking.map.eta')}
                    {etaMinutes != null ? `${etaMinutes} ${t('tracking.map.min')}` : '—'}
                  </Text>
                  {updatedAt && (
                    <Text style={styles.sheetUpdatedText}>
                      {t('tracking.map.updated')}
                      {updatedAt.toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              )}

              {!isLive && routeStatusKey === 'noSignal' && (
                <Text style={styles.sheetHintWarn}>{t('tracking.map.busSignalLost')}</Text>
              )}
              {!isLive && routeStatusKey !== 'noSignal' && (
                <Text style={styles.sheetHintMuted}>{t('tracking.map.routeNotActive')}</Text>
              )}
            </>
          )}

          <Text style={styles.sheetExpandHint}>
            {sheetExpanded ? '▲ Tap to collapse' : '▼ Tap for details'}
          </Text>
        </Pressable>
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
    backgroundColor: 'rgba(15,23,42,0.92)',
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
    marginBottom: 10,
  },
  sheetTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 18, flexShrink: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeLive: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderColor: 'rgba(34,197,94,0.45)',
  },
  statusBadgeNoSignal: {
    backgroundColor: 'rgba(234,179,8,0.18)',
    borderColor: 'rgba(234,179,8,0.45)',
  },
  statusBadgeIdle: {
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderColor: 'rgba(148,163,184,0.45)',
  },
  statusBadgeText: { color: '#f1f5f9', fontSize: 11, fontWeight: '700' },

  sheetLine: { color: '#cbd5e1', fontSize: 13, marginTop: 2 },
  sheetLineStrong: { color: '#f8fafc', fontWeight: '600' },
  sheetLineMuted: { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  sheetEtaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sheetEtaText: { color: '#60a5fa', fontWeight: '700', fontSize: 13 },
  sheetUpdatedText: { color: '#94a3b8', fontSize: 11 },

  alertRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  alertText: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  alertTextNormal: { color: '#22c55e', backgroundColor: 'rgba(34,197,94,0.15)' },
  alertTextDelay: { color: '#eab308', backgroundColor: 'rgba(234,179,8,0.15)' },
  alertTextEmergency: { color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)' },

  alertChip: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  alertChipDelay: {
    backgroundColor: '#eab308',
    borderColor: '#facc15',
  },
  alertChipEmergency: {
    backgroundColor: '#ef4444',
    borderColor: '#fca5a5',
  },
  alertChipText: { color: '#0b1020', fontSize: 12, fontWeight: '800' },

  // Dark pill style for the BACK arrow on the map screen — matches MAP RESET
  // so the control is clearly visible against light/satellite map tiles
  // (parity with web portal map controls).
  backBtnDark: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  mapResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginRight: 6,
  },
  mapResetIcon: { color: '#f8fafc', fontSize: 14, marginRight: 4 },
  mapResetText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  sheetHintWarn: { color: '#facc15', fontSize: 11, marginTop: 8 },
  sheetHintMuted: { color: '#94a3b8', fontSize: 11, marginTop: 8 },
  sheetExpandHint: {
    color: '#a5b4fc',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
