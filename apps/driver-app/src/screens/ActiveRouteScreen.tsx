import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline, LatLng } from 'react-native-maps';
import { useDriverStore } from '../store/useDriverStore';
import { GPSService } from '../services/gps.service';
import { EmergencyService } from '../services/emergency.service';
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

  useEffect(() => {
    startGps();
    return () => {
      void GPSService.stopTracking();
    };
  }, []);

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
      setRegion({
        ...region,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      if (activeRoute && driver && vehicleId) {
        await GPSService.startTracking(activeRoute.id, vehicleId, driver.id);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'GPS unavailable';
      Alert.alert('GPS Error', message);
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

  const handleEndRoute = () => {
    Alert.alert('End Route', 'Are you sure you want to end this route? All tracking will stop.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Route',
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
        <Text>No Active Route</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        showsUserLocation={true}
        followsUserLocation={false}
      >
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

          <TouchableOpacity style={[styles.button, styles.endButton]} onPress={handleEndRoute}>
            <Text style={styles.buttonText}>End Route</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.panicButton} onPress={handlePanic}>
          <Text style={styles.panicText}>PANIC</Text>
        </TouchableOpacity>
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
    marginBottom: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  rosterButton: { backgroundColor: '#007AFF' },
  endButton: { backgroundColor: '#FF9500' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  panicButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  panicText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
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
});
