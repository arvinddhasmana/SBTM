import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, LatLng } from 'react-native-maps';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDriverStore } from '../store/useDriverStore';
import { GPSService } from '../services/gps.service';
import { EmergencyService } from '../services/emergency.service';
import { useBleScanning } from '../hooks/useBleScanning';
import { useRouteStatus } from '../hooks/useRouteStatus';
import { usePanicDetection } from '../hooks/usePanicDetection';
import { useDynamicReroute } from '../hooks/useDynamicReroute';
import { decodePolyline } from '../utils/polyline';
import { closestIndexToPolyline, haversineMeters } from '../utils/geo';
import { DARK_MAP_STYLE } from '../constants/mapStyles';
import BusNavigationMarker from '../components/map/BusNavigationMarker';
import StopMarkerView from '../components/map/StopMarker';
import SchoolMarkerView from '../components/map/SchoolMarker';
import CollapsibleBottomPanel from '../components/CollapsibleBottomPanel';
import PanicCountdownModal from '../components/PanicCountdownModal';
import StopRosterModal from '../components/StopRosterModal';
import { SpeedIndicator, NextStopBanner, RouteProgressBar } from '../components/map/MapOverlays';
import DashedPolyline from '../components/map/DashedPolyline';

const GLASS_BG = 'rgba(15,23,42,0.75)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

export default function ActiveRouteScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeRoute = useDriverStore((state) => state.activeRoute);
  const driver = useDriverStore((state) => state.driver);
  const endRoute = useDriverStore((state) => state.endRoute);
  const stops = useDriverStore((state) => state.stops);
  const visitedStopIds = useDriverStore((state) => state.visitedStopIds);
  const markStopVisited = useDriverStore((state) => state.markStopVisited);
  const routeDirection = useDriverStore((state) => state.routeDirection);

  const mapRef = useRef<MapView>(null);

  const vehicleId = activeRoute?.vehicleId ?? '';
  const schoolId = activeRoute?.schoolId ?? '';

  // Route status derived from active alerts
  const { status: routeStatus, infoRequestCount } = useRouteStatus(activeRoute?.id);

  // Current GPS location for the bus marker
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
  } | null>(null);

  // Stop Popup state
  const [arrivedStopIdForPopup, setArrivedStopIdForPopup] = useState<string | null>(null);

  // Panel expanded state
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // Panic countdown modal
  const [panicModalVisible, setPanicModalVisible] = useState(false);
  const [panicReason, setPanicReason] = useState('');

  // Incident Report Modal
  const [isIncidentModalVisible, setIsIncidentModalVisible] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const startVoiceInput = useCallback(
    (setter: (v: string) => void, current: string) => {
      if (Platform.OS === 'android') {
        try {
          // Use Android's built-in speech recognizer via expo intent
          const IntentLauncher = require('expo-intent-launcher');
          IntentLauncher.startActivityAsync('android.speech.action.RECOGNIZE_SPEECH', {
            extra: {
              'android.speech.extra.LANGUAGE_MODEL': 'free_form',
              'android.speech.extra.PROMPT': t('activeRoute.voice.prompt'),
            },
          })
            .then((result: any) => {
              if (result.resultCode === -1 && result.data) {
                const text = result.data?.extras?.['android.speech.extra.RESULTS']?.[0];
                if (text) setter(current ? `${current} ${text}` : text);
              }
            })
            .catch(() => {
              Alert.alert(t('activeRoute.voice.title'), t('activeRoute.voice.unavailable'));
            });
        } catch {
          Alert.alert(t('activeRoute.voice.title'), t('activeRoute.voice.notSupported'));
        }
      } else {
        Alert.alert(t('activeRoute.voice.title'), t('activeRoute.voice.iosHint'));
      }
    },
    [t],
  );

  // Default region — null until first GPS fix; map will center on route once GPS resolves
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  // Decode route polyline
  const routePath: LatLng[] = useMemo(() => {
    if (!activeRoute?.polyline) return [];
    const coords = decodePolyline(activeRoute.polyline).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

    // CRITICAL FIX: Ensure route path includes connection to school
    // This handles both new routes (with school in polyline) and legacy routes (without)
    if (coords.length > 0 && activeRoute.schoolLat != null && activeRoute.schoolLng != null) {
      const schoolPos = { latitude: activeRoute.schoolLat, longitude: activeRoute.schoolLng };
      const lastPoint = coords[coords.length - 1];
      const firstPoint = coords[0];

      // Check if path already connects to school (within 50 meters)
      const distanceToSchoolFromEnd = Math.sqrt(
        Math.pow((lastPoint.latitude - schoolPos.latitude) * 111000, 2) +
        Math.pow((lastPoint.longitude - schoolPos.longitude) * 111000, 2)
      );
      const distanceToSchoolFromStart = Math.sqrt(
        Math.pow((firstPoint.latitude - schoolPos.latitude) * 111000, 2) +
        Math.pow((firstPoint.longitude - schoolPos.longitude) * 111000, 2)
      );

      // For AM routes: if path doesn't end at school, add the connection
      if (routeDirection === 'AM' && distanceToSchoolFromEnd > 50) {
        return [...coords, schoolPos];
      }
      // For PM routes: if path doesn't start at school, add the connection
      else if (routeDirection === 'PM' && distanceToSchoolFromStart > 50) {
        return [schoolPos, ...coords];
      }
    }

    return coords;
  }, [activeRoute?.polyline, activeRoute?.schoolLat, activeRoute?.schoolLng, routeDirection]);

  // Split the route polyline into visited and unvisited parts based on nearest point to bus
  const { visitedRoutePath, unvisitedRoutePath } = useMemo(() => {
    if (routePath.length === 0 || !currentLocation) {
      return { visitedRoutePath: [], unvisitedRoutePath: routePath };
    }

    // If the entire route is considered finished tracking, etc. you could also check logic here
    const closestIdx = closestIndexToPolyline(
      currentLocation.latitude,
      currentLocation.longitude,
      routePath,
    );

    if (closestIdx <= 0) {
      return { visitedRoutePath: [], unvisitedRoutePath: routePath };
    }

    // Split roughly at the closest index
    const visited = routePath.slice(0, closestIdx + 1);
    const unvisited = routePath.slice(closestIdx);

    return { visitedRoutePath: visited, unvisitedRoutePath: unvisited };
  }, [routePath, currentLocation]);

  // BLE scanning
  const { scanState } = useBleScanning(
    activeRoute?.id ?? '',
    vehicleId,
    schoolId,
    Boolean(activeRoute),
  );

  // Night mode
  const isNightMode = useMemo(() => {
    if (!activeRoute?.startTime) return false;
    const hour = parseInt(activeRoute.startTime.split(':')[0] ?? '12', 10);
    return hour < 7 || hour >= 19;
  }, [activeRoute?.startTime]);

  // Dynamic Rerouting
  const { isDiverted, divertedPolyline, distFromRoute } = useDynamicReroute(
    currentLocation,
    routePath,
    stops,
    visitedStopIds,
  );

  // ── Panic detection (multi-tap + drop) ─────────────────────────
  const firePanic = useCallback(async () => {
    try {
      const loc = await GPSService.getCurrentLocation();
      await EmergencyService.triggerPanic(
        vehicleId,
        activeRoute?.id ?? 'unknown',
        { lat: loc.coords.latitude, lng: loc.coords.longitude },
        driver?.id,
      );
      Alert.alert(t('activeRoute.panic.alertSent'), t('activeRoute.panic.helpOnWay'));
    } catch {
      Alert.alert(t('activeRoute.error.title'), t('activeRoute.panic.failed'));
    }
  }, [vehicleId, activeRoute?.id, driver?.id, t]);

  const { registerTap } = usePanicDetection(Boolean(activeRoute), (reason: string) => {
    setPanicReason(reason);
    setPanicModalVisible(true);
  });

  useEffect(() => {
    startGps();
    return () => {
      void GPSService.stopTracking();
    };
  }, []);

  // Fit map to route bounds
  useEffect(() => {
    if (!mapRef.current) return;
    const coords: LatLng[] = [...routePath];
    for (const stop of stops) {
      if (stop.lat != null && stop.lng != null) {
        coords.push({ latitude: stop.lat, longitude: stop.lng });
      }
    }
    if (activeRoute?.schoolLat != null && activeRoute?.schoolLng != null) {
      coords.push({ latitude: activeRoute.schoolLat, longitude: activeRoute.schoolLng });
    }
    if (coords.length > 1) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  }, [routePath, stops, activeRoute?.schoolLat, activeRoute?.schoolLng]);

  const startGps = async () => {
    try {
      await GPSService.requestPermissions();
      const current = await GPSService.getCurrentLocation();
      const lat = current.coords.latitude;
      const lng = current.coords.longitude;
      setRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: region?.latitudeDelta ?? 0.05,
        longitudeDelta: region?.longitudeDelta ?? 0.05,
      });
      setCurrentLocation({
        latitude: lat,
        longitude: lng,
        heading: current.coords.heading ?? 0,
        speed: current.coords.speed ?? 0,
      });

      if (activeRoute && driver && vehicleId) {
        await GPSService.startTracking(activeRoute.id, vehicleId, driver.id);
      }
      startLocationWatch();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('activeRoute.gps.unavailable');
      Alert.alert(t('activeRoute.gps.error'), message);
    }
  };

  const startLocationWatch = async () => {
    try {
      const Location = require('expo-location');
      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (location: any) => {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading ?? 0,
            speed: location.coords.speed ?? 0,
          });
        },
      );
    } catch {
      // marker stays at last known position
    }
  };

  // Auto-visit geofence check (30 meters)
  useEffect(() => {
    if (!currentLocation) return;
    for (const stop of stops) {
      if (stop.lat && stop.lng && !visitedStopIds.includes(stop.id)) {
        const dist = haversineMeters(
          currentLocation.latitude,
          currentLocation.longitude,
          stop.lat,
          stop.lng,
        );
        if (dist < 30) {
          markStopVisited(stop.id);
          setArrivedStopIdForPopup(stop.id); // Auto-open stop popup
        }
      }
    }
  }, [currentLocation, stops, visitedStopIds, markStopVisited]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleRecenter = useCallback(() => {
    if (!currentLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500,
    );
  }, [currentLocation]);

  const togglePanel = useCallback(() => {
    const toValue = panelExpanded ? 0 : 1;
    Animated.spring(panelAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    setPanelExpanded(!panelExpanded);
  }, [panelExpanded, panelAnim]);

  const handleMapPress = useCallback(() => {
    // Register tap for panic detection
    registerTap();
    // Collapse panel if expanded
    if (panelExpanded) {
      togglePanel();
    }
  }, [panelExpanded, togglePanel, registerTap]);

  // Animated positions for overlays
  const speedBottom = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [125, 235],
  });

  const devBadgeBottom = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [135, 245],
  });

  const handlePanic = () => {
    setPanicReason(t('activeRoute.panic.manualTrigger'));
    setPanicModalVisible(true);
  };

  const handleReportIncident = () => {
    setIncidentDescription('');
    setIsIncidentModalVisible(true);
  };

  const submitIncidentReport = async () => {
    if (!incidentDescription.trim()) {
      Alert.alert(t('activeRoute.error.title'), t('activeRoute.error.provideDescription'));
      return;
    }
    setIsIncidentModalVisible(false);
    try {
      const loc = await GPSService.getCurrentLocation();
      await EmergencyService.reportIncident(
        vehicleId,
        activeRoute?.id ?? 'unknown',
        { lat: loc.coords.latitude, lng: loc.coords.longitude },
        incidentDescription.trim(),
        driver?.id,
      );
      Alert.alert(t('activeRoute.incident.reported'), t('activeRoute.incident.reportedMessage'));
    } catch {
      Alert.alert(t('activeRoute.error.title'), t('activeRoute.error.incidentFailed'));
    }
  };

  const handleEndRoute = () => {
    Alert.alert(t('activeRoute.endRoute.title'), t('activeRoute.endRoute.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('activeRoute.endRoute.confirm'),
        style: 'destructive',
        onPress: async () => {
          await endRoute();
          navigation.popToTop();
        },
      },
    ]);
  };

  if (!activeRoute)
    return (
      <View style={styles.center}>
        <Text style={{ color: '#fff' }}>{t('activeRoute.noActiveRoute')}</Text>
      </View>
    );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Route Progress Bar */}
      <RouteProgressBar
        stops={stops}
        currentLat={currentLocation?.latitude ?? null}
        currentLng={currentLocation?.longitude ?? null}
        direction={routeDirection}
      />

      {/* Incident Report Modal – glassmorphic */}
      {isIncidentModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('activeRoute.incident.title')}</Text>
            <Text style={styles.modalSubtitle}>{t('activeRoute.incident.subtitle')}</Text>
            <View style={styles.modalInputWrapper}>
              <TextInput
                style={styles.modalInput}
                placeholder={t('activeRoute.incident.placeholder')}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={incidentDescription}
                onChangeText={setIncidentDescription}
                multiline
              />
              <TouchableOpacity
                style={styles.micButton}
                onPress={() => startVoiceInput(setIncidentDescription, incidentDescription)}
              >
                <MaterialCommunityIcons
                  name="microphone"
                  size={20}
                  color={isRecording ? '#ef4444' : 'rgba(255,255,255,0.6)'}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsIncidentModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={submitIncidentReport}
              >
                <Text style={styles.modalBtnSubmitText}>{t('activeRoute.incident.report')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        region={region ?? undefined}
        showsUserLocation={false}
        followsUserLocation={false}
        customMapStyle={isNightMode ? DARK_MAP_STYLE : undefined}
        onPress={handleMapPress}
      >
        {/* Bus – bare navigation arrow colored by status */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={currentLocation.heading}
            title={t('activeRoute.bus')}
            description={t('activeRoute.currentLocation')}
            zIndex={20}
          >
            <BusNavigationMarker status={routeStatus} />
          </Marker>
        )}

        {/* Reroute polyline – neon dashes back to next stop */}
        {isDiverted && divertedPolyline.length > 0 && (
          <DashedPolyline
            coordinates={divertedPolyline}
            strokeColor="#00ff88"
            strokeWidth={4}
            dashLength={25}
            gapLength={15}
            zIndex={3}
          />
        )}

        {/* Visited portion of Route polyline (Dimmed) */}
        {visitedRoutePath.length > 0 && (
          <Polyline
            coordinates={visitedRoutePath}
            strokeColor={
              routeDirection === 'AM'
                ? 'rgba(59, 130, 246, 0.3)' // Dim blue
                : 'rgba(245, 158, 11, 0.3)' // Dim amber
            }
            strokeWidth={6}
            lineJoin="round"
            lineCap="round"
            zIndex={1}
          />
        )}

        {/* Unvisited portion of Route polyline (Highlighted) */}
        {unvisitedRoutePath.length > 0 && (
          <Polyline
            coordinates={unvisitedRoutePath}
            strokeColor={routeDirection === 'AM' ? '#3b82f6' : '#f59e0b'}
            strokeWidth={6}
            lineJoin="round"
            lineCap="round"
            zIndex={2}
          />
        )}

        {/* Stop markers */}
        {stops
          .filter((s) => s.lat != null && s.lng != null)
          .map((stop) => (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat!, longitude: stop.lng! }}
              title={t('activeRoute.stop', { number: stop.sequence, name: stop.stopName })}
              description={
                stop.arrivalTime ? t('activeRoute.arrival', { time: stop.arrivalTime }) : undefined
              }
              zIndex={10}
            >
              <StopMarkerView sequence={stop.sequence} direction={routeDirection} />
            </Marker>
          ))}

        {/* School marker */}
        {activeRoute.schoolLat != null && activeRoute.schoolLng != null && (
          <Marker
            coordinate={{
              latitude: activeRoute.schoolLat,
              longitude: activeRoute.schoolLng,
            }}
            title={activeRoute.schoolName ?? t('activeRoute.school')}
            zIndex={10}
          >
            <SchoolMarkerView />
          </Marker>
        )}
      </MapView>

      {/* Next Stop Banner – glassmorphic */}
      <NextStopBanner
        stops={stops}
        currentLat={currentLocation?.latitude ?? null}
        currentLng={currentLocation?.longitude ?? null}
        direction={routeDirection}
        visitedStopIds={visitedStopIds}
      />

      {/* Reset Button – glassmorphic */}
      <TouchableOpacity
        style={[styles.resetButton, { top: insets.top + 50 }]}
        onPress={handleRecenter}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Circle
            cx={12}
            cy={12}
            r={8}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={2}
            fill="none"
          />
          <Line x1={12} y1={2} x2={12} y2={6} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
          <Line x1={12} y1={18} x2={12} y2={22} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
          <Line x1={2} y1={12} x2={6} y2={12} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
          <Line x1={18} y1={12} x2={22} y2={12} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
          <Circle cx={12} cy={12} r={2} fill="rgba(255,255,255,0.8)" />
        </Svg>
      </TouchableOpacity>

      {/* Speed Indicator */}
      <SpeedIndicator speedMps={currentLocation?.speed ?? null} style={{ bottom: speedBottom }} />

      {/* Divert debug badge - shows dist from route; hidden when on-route */}
      {__DEV__ && (
        <Animated.View style={[styles.debugBadge, { bottom: devBadgeBottom }]}>
          <Text style={styles.debugText}>
            {isDiverted ? `🔀 Deviation: ${distFromRoute}m` : `✅ Snapped`}
          </Text>
        </Animated.View>
      )}

      {/* Collapsible Bottom Panel – glassmorphic */}
      <CollapsibleBottomPanel
        routeName={activeRoute.name}
        routeDirection={routeDirection}
        scanState={scanState}
        infoRequestCount={infoRequestCount}
        expanded={panelExpanded}
        onToggle={togglePanel}
        onNavigateRoster={() => navigation.navigate('Roster')}
        onNavigateMessages={() => navigation.navigate('AlertMessages')}
        onEndRoute={handleEndRoute}
        onReportIncident={handleReportIncident}
        onPanic={handlePanic}
      />

      {/* Panic Countdown Modal */}
      <PanicCountdownModal
        visible={panicModalVisible}
        reason={panicReason}
        onConfirm={() => {
          setPanicModalVisible(false);
          firePanic();
        }}
        onCancel={() => setPanicModalVisible(false)}
      />

      {/* Auto Stop Roster Modal */}
      <StopRosterModal
        stopId={arrivedStopIdForPopup}
        onClose={() => setArrivedStopIdForPopup(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  map: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  resetButton: {
    position: 'absolute',
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugBadge: {
    position: 'absolute',
    bottom: 135,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  debugText: {
    fontSize: 11,
    color: '#00ff88',
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
  },
  // Modal – glassmorphic
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'rgba(10,16,35,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 18,
    borderRadius: 16,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 10,
  },
  modalInputWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    paddingRight: 44,
    minHeight: 250,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#fff',
  },
  micButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    padding: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  modalBtnSubmit: {
    backgroundColor: 'rgba(245,158,11,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  modalBtnCancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnSubmitText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
