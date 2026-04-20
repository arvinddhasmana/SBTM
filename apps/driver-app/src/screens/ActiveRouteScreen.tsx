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
} from 'react-native';
import MapView, { Marker, Polyline, LatLng } from 'react-native-maps';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverStore } from '../store/useDriverStore';
import { GPSService } from '../services/gps.service';
import { EmergencyService } from '../services/emergency.service';
import { useBleScanning } from '../hooks/useBleScanning';
import { useRouteStatus } from '../hooks/useRouteStatus';
import { usePanicDetection } from '../hooks/usePanicDetection';
import { useDynamicReroute } from '../hooks/useDynamicReroute';
import { decodePolyline } from '../utils/polyline';
import { DARK_MAP_STYLE } from '../constants/mapStyles';
import BusNavigationMarker from '../components/map/BusNavigationMarker';
import StopMarkerView from '../components/map/StopMarker';
import SchoolMarkerView from '../components/map/SchoolMarker';
import CollapsibleBottomPanel from '../components/CollapsibleBottomPanel';
import PanicCountdownModal from '../components/PanicCountdownModal';
import { SpeedIndicator, NextStopBanner, RouteProgressBar } from '../components/map/MapOverlays';

const GLASS_BG = 'rgba(15,23,42,0.75)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

export default function ActiveRouteScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const activeRoute = useDriverStore((state) => state.activeRoute);
  const driver = useDriverStore((state) => state.driver);
  const endRoute = useDriverStore((state) => state.endRoute);
  const stops = useDriverStore((state) => state.stops);
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

  // Panel expanded state
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // Panic countdown modal
  const [panicModalVisible, setPanicModalVisible] = useState(false);
  const [panicReason, setPanicReason] = useState('');

  // Incident Report Modal
  const [isIncidentModalVisible, setIsIncidentModalVisible] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState('');

  // Default region
  const [region, setRegion] = useState({
    latitude: 45.3506,
    longitude: -75.7934,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Decode route polyline
  const routePath: LatLng[] = useMemo(() => {
    if (!activeRoute?.polyline) return [];
    return decodePolyline(activeRoute.polyline).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));
  }, [activeRoute?.polyline]);

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
  const { isDiverted, divertedPolyline } = useDynamicReroute(currentLocation, routePath, stops);

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
      Alert.alert('Alert Sent', 'Help is on the way.');
    } catch {
      Alert.alert('Error', 'Failed to send panic alert.');
    }
  }, [vehicleId, activeRoute?.id, driver?.id]);

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
      setRegion({ ...region, latitude: lat, longitude: lng });
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
      const message = e instanceof Error ? e.message : 'GPS unavailable';
      Alert.alert('GPS Error', message);
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

  const handleMapPress = useCallback(() => {
    // Register tap for panic detection
    registerTap();
    // Collapse panel if expanded
    if (panelExpanded) {
      Animated.spring(panelAnim, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
      setPanelExpanded(false);
    }
  }, [panelExpanded, panelAnim, registerTap]);

  const handlePanic = () => {
    setPanicReason('Manual panic trigger');
    setPanicModalVisible(true);
  };

  const handleReportIncident = () => {
    setIncidentDescription('');
    setIsIncidentModalVisible(true);
  };

  const submitIncidentReport = async () => {
    if (!incidentDescription.trim()) {
      Alert.alert('Error', 'Please provide a description.');
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
      Alert.alert('Incident Reported', 'Your report has been sent to the admin.');
    } catch {
      Alert.alert('Error', 'Failed to send incident report.');
    }
  };

  const handleEndRoute = () => {
    Alert.alert(
      'End Route',
      'Are you sure you want to end this route? All tracking will stop and boarded students will be alighted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Route',
          style: 'destructive',
          onPress: async () => {
            await endRoute();
            navigation.popToTop();
          },
        },
      ],
    );
  };

  if (!activeRoute)
    return (
      <View style={styles.center}>
        <Text style={{ color: '#fff' }}>No Active Route</Text>
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
            <Text style={styles.modalTitle}>Report Incident</Text>
            <Text style={styles.modalSubtitle}>Briefly describe the incident:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="E.g., minor scrape, mechanical defect..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={incidentDescription}
              onChangeText={setIncidentDescription}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsIncidentModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={submitIncidentReport}
              >
                <Text style={styles.modalBtnSubmitText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
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
            title="Bus"
            description="Current location"
            zIndex={20}
          >
            <BusNavigationMarker status={routeStatus} />
          </Marker>
        )}

        {/* Reroute polyline (shows if diverted) */}
        {isDiverted && divertedPolyline.length > 0 && (
          <Polyline
            coordinates={divertedPolyline}
            strokeColor="#10b981" // Green to indicate Google-like re-route
            strokeWidth={4}
            lineDashPattern={[10, 10]}
            lineJoin="round"
            lineCap="round"
            zIndex={3}
          />
        )}

        {/* Route polyline */}
        {routePath.length > 0 && (
          <Polyline
            coordinates={routePath}
            strokeColor={
              routeDirection === 'AM'
                ? isDiverted
                  ? 'rgba(59, 130, 246, 0.4)'
                  : '#3b82f6'
                : isDiverted
                  ? 'rgba(245, 158, 11, 0.4)'
                  : '#f59e0b'
            }
            strokeWidth={isDiverted ? 2 : 3}
            lineJoin="round"
            lineCap="round"
            zIndex={1}
          />
        )}

        {/* Stop markers */}
        {stops
          .filter((s) => s.lat != null && s.lng != null)
          .map((stop) => (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat!, longitude: stop.lng! }}
              title={`Stop ${stop.sequence}: ${stop.stopName}`}
              description={stop.arrivalTime ? `Arrival: ${stop.arrivalTime}` : undefined}
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
            title={activeRoute.schoolName ?? 'School'}
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

      {/* Speed Indicator – glassmorphic */}
      <SpeedIndicator speedMps={currentLocation?.speed ?? null} />

      {/* Collapsible Bottom Panel – glassmorphic */}
      <CollapsibleBottomPanel
        routeName={activeRoute.name}
        routeDirection={routeDirection}
        scanState={scanState}
        infoRequestCount={infoRequestCount}
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
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 20,
    borderRadius: 16,
    width: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#fff',
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
