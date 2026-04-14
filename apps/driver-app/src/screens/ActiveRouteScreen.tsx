import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import MapView, { Marker, Polyline, LatLng } from 'react-native-maps';
import { useDriverStore } from '../store/useDriverStore';
import { GPSService } from '../services/gps.service';
import { EmergencyService } from '../services/emergency.service';
import { AlertService } from '../services/alert.service';
import { useBleScanning } from '../hooks/useBleScanning';
import { decodePolyline } from '../utils/polyline';

export default function ActiveRouteScreen({ navigation }: any) {
  const activeRoute = useDriverStore((state) => state.activeRoute);
  const driver = useDriverStore((state) => state.driver);
  const endRoute = useDriverStore((state) => state.endRoute);
  const stops = useDriverStore((state) => state.stops);
  const routeDirection = useDriverStore((state) => state.routeDirection);

  const mapRef = useRef<MapView>(null);

  // vehicleId is sourced from the authenticated route assignment – never hardcoded
  const vehicleId = activeRoute?.vehicleId ?? '';
  const schoolId = activeRoute?.schoolId ?? '';

  // Current GPS location for the bus arrow marker
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number;
  } | null>(null);

  // Unread info request badge count
  const [infoRequestCount, setInfoRequestCount] = useState(0);

  // States for Incident Report Modal
  const [isIncidentModalVisible, setIsIncidentModalVisible] = useState(false);
  const [incidentDescription, setIncidentDescription] = useState('');

  // Default to Ottawa (Greenfield Elementary demo area)
  const [region, setRegion] = useState({
    latitude: 45.3506,
    longitude: -75.7934,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Decode route polyline into coordinates for the map
  const routePath: LatLng[] = useMemo(() => {
    if (!activeRoute?.polyline) return [];
    return decodePolyline(activeRoute.polyline).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));
  }, [activeRoute?.polyline]);

  // BLE scanning – enabled only while an active route is running (NFR-BATT-001)
  const { scanState } = useBleScanning(
    activeRoute?.id ?? '',
    vehicleId,
    schoolId,
    Boolean(activeRoute),
  );

  // Poll for info requests (lightweight MVP)
  const checkInfoRequests = useCallback(async () => {
    if (!activeRoute) return;
    try {
      const alerts = await AlertService.getActiveAlerts(activeRoute.id);
      let count = 0;
      for (const alert of alerts) {
        const log = await AlertService.getAlertAuditLog(alert.id);
        count += log.filter((e) => e.action === 'INFO_REQUESTED').length;
      }
      setInfoRequestCount(count);
    } catch {
      // Non-critical; badge won't show
    }
  }, [activeRoute]);

  useEffect(() => {
    startGps();
    return () => {
      void GPSService.stopTracking();
    };
  }, []);

  // Poll for info request badges every 30 seconds
  useEffect(() => {
    checkInfoRequests();
    const interval = setInterval(checkInfoRequests, 30000);
    return () => clearInterval(interval);
  }, [checkInfoRequests]);

  // Fit map to route bounds when polyline or stops are available
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
        ...region,
        latitude: lat,
        longitude: lng,
      });
      setCurrentLocation({
        latitude: lat,
        longitude: lng,
        heading: current.coords.heading ?? 0,
      });

      if (activeRoute && driver && vehicleId) {
        await GPSService.startTracking(activeRoute.id, vehicleId, driver.id);
      }

      // Start watching location for the bus marker
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
          });
        },
      );
    } catch {
      // Fallback: marker stays at last known position
    }
  };

  const handlePanic = async () => {
    Alert.alert('Emergency', 'Are you sure you want to trigger a panic alert?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'YES, PANIC',
        style: 'destructive',
        onPress: async () => {
          const loc = await GPSService.getCurrentLocation();
          await EmergencyService.triggerPanic(
            vehicleId,
            activeRoute?.id ?? 'unknown',
            { lat: loc.coords.latitude, lng: loc.coords.longitude },
            driver?.id,
          );
          Alert.alert('Alert Sent', 'Help is on the way.');
        },
      },
    ]);
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
        <Text>No Active Route</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Incident Report Modal */}
      {isIncidentModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Incident</Text>
            <Text style={styles.modalSubtitle}>Briefly describe the incident:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="E.g., minor scrape, mechanical defect..."
              value={incidentDescription}
              onChangeText={setIncidentDescription}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setIsIncidentModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={submitIncidentReport}
              >
                <Text style={styles.modalButtonSubmitText}>Report</Text>
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
      >
        {/* Bus location – yellow navigation arrow */}
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
          >
            <View style={styles.busArrowContainer}>
              <View style={styles.busArrow} />
              <View style={styles.busArrowDot} />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {routePath.length > 0 && (
          <Polyline
            coordinates={routePath}
            strokeColor={routeDirection === 'AM' ? '#3b82f6' : '#f59e0b'}
            strokeWidth={5}
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
              pinColor="#007AFF"
            >
              <View style={styles.stopMarker}>
                <Text style={styles.stopMarkerText}>{stop.sequence}</Text>
              </View>
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
            pinColor="#8b5cf6"
          >
            <View style={styles.schoolMarker}>
              <Text style={styles.schoolMarkerText}>S</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.controls}>
        <View style={styles.infoPanel}>
          <Text style={styles.routeTitle}>{activeRoute.name}</Text>
          <Text style={styles.directionBadge}>
            {routeDirection === 'AM' ? 'AM Route' : 'PM Route'}
          </Text>
          {scanState === 'scanning' && <Text style={styles.bleStatus}>BLE Scanning Active</Text>}
          {scanState === 'permission_denied' && (
            <Text style={styles.bleWarning}>Bluetooth permission denied – manual roster only</Text>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.rosterButton]}
            onPress={() => navigation.navigate('Roster')}
          >
            <Text style={styles.buttonText}>Roster</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.messagesButton]}
            onPress={() => navigation.navigate('AlertMessages')}
          >
            <Text style={styles.buttonText}>Messages</Text>
            {infoRequestCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{infoRequestCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.endButton]} onPress={handleEndRoute}>
            <Text style={styles.buttonText}>End Route</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertRow}>
          <TouchableOpacity style={styles.incidentButton} onPress={handleReportIncident}>
            <Text style={styles.incidentText}>Report Incident</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.panicButton} onPress={handlePanic}>
            <Text style={styles.panicText}>PANIC</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  controls: {
    padding: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  infoPanel: {
    marginBottom: 20,
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  directionBadge: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  bleStatus: {
    fontSize: 13,
    color: '#34C759',
    marginTop: 4,
  },
  bleWarning: {
    fontSize: 13,
    color: '#FF9500',
    marginTop: 4,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    position: 'relative',
  },
  rosterButton: { backgroundColor: '#007AFF' },
  messagesButton: { backgroundColor: '#6366f1' },
  endButton: { backgroundColor: '#FF9500' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  incidentButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  incidentText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  panicButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  panicText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  // Bus arrow marker – small, bright, non-blocking yellow directional arrow
  busArrowContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  busArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f59e0b',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  busArrowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
    marginTop: -2,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  stopMarker: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stopMarkerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  schoolMarker: {
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  schoolMarkerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonSubmit: {
    backgroundColor: '#f59e0b',
  },
  modalButtonCancelText: {
    color: '#333',
    fontWeight: '600',
  },
  modalButtonSubmitText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
