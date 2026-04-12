import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useDriverStore } from '../store/useDriverStore';
import { GPSService } from '../services/gps.service';
import { EmergencyService } from '../services/emergency.service';
import { useBleScanning } from '../hooks/useBleScanning';

export default function ActiveRouteScreen({ navigation }: any) {
  const activeRoute = useDriverStore((state) => state.activeRoute);
  const driver = useDriverStore((state) => state.driver);
  const endRoute = useDriverStore((state) => state.endRoute);

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
    void endRoute();
    navigation.popToTop();
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
        style={styles.map}
        region={region}
        showsUserLocation={true}
        followsUserLocation={true}
      />

      <View style={styles.controls}>
        <View style={styles.infoPanel}>
          <Text style={styles.routeTitle}>{activeRoute.name}</Text>
          <Text style={styles.nextStop}>Next: Central Station (ETA 5m)</Text>
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
  nextStop: {
    fontSize: 16,
    color: '#666',
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
});
