import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useParentStore } from '../store/useParentStore';
import { ParentApiService } from '../services/ParentApiService';
import { BusLocationUpdate, Route, RootStackParamList } from '../types';
import { BUS_LOCATION_POLL_MS } from '../config/constants';

type MapScreenRouteProp = RouteProp<RootStackParamList, 'Map'>;

export default function MapScreen() {
  const route = useRoute<MapScreenRouteProp>();
  const navigation = useNavigation();
  const { children } = useParentStore();
  const mapRef = useRef<MapView>(null);

  const [child, setChild] = useState(() => children.find((c) => c.id === route.params.childId));
  const [busLocation, setBusLocation] = useState<BusLocationUpdate | null>(null);
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMapData();

    // Poll for location updates every 5 seconds
    const interval = setInterval(fetchBusLocation, BUS_LOCATION_POLL_MS);

    return () => clearInterval(interval);
  }, []);

  const loadMapData = async () => {
    try {
      if (!child) return;

      // Use AM route for now (TODO: determine active route)
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

      // Fit map to route
      if (details.stops && details.stops.length > 0) {
        fitMapToRoute(details);
      }
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
    } catch (error) {
      // Silent fail for polling
    }
  };

  const fitMapToRoute = (details: Route) => {
    if (!mapRef.current || !details.stops || details.stops.length === 0) return;

    const coordinates = details.stops.map((stop) => ({
      latitude: stop.lat,
      longitude: stop.lng,
    }));

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
      animated: true,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Child not found</Text>
      </View>
    );
  }

  const isLive = busLocation && routeDetails;

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
        {/* Bus Marker */}
        {isLive && busLocation && (
          <Marker
            coordinate={{
              latitude: busLocation.lat,
              longitude: busLocation.lng,
            }}
            title="School Bus"
            description={`Route: ${routeDetails?.name || 'Unknown'}`}
          >
            <View style={styles.busMarker}>
              <Text style={styles.busMarkerText}>🚌</Text>
            </View>
          </Marker>
        )}

        {/* Stop Markers */}
        {routeDetails?.stops?.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={stop.name}
            description={`Stop #${stop.sequence}`}
          >
            <View
              style={[styles.stopMarker, stop.id === child.stopId && styles.stopMarkerHighlight]}
            >
              <Text style={styles.stopMarkerText}>{stop.sequence}</Text>
            </View>
          </Marker>
        ))}

        {/* Route Polyline */}
        {routeDetails?.stops && routeDetails.stops.length > 1 && (
          <Polyline
            coordinates={routeDetails.stops.map((stop) => ({
              latitude: stop.lat,
              longitude: stop.lng,
            }))}
            strokeColor={routeDetails.direction === 'AM' ? '#3b82f6' : '#f59e0b'}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.childName}>
          {child.firstName} {child.lastName}
        </Text>
        <Text style={styles.routeName}>
          {routeDetails?.name || 'Route'} ({routeDetails?.direction || 'AM'})
        </Text>
        {isLive && busLocation ? (
          <>
            <Text style={styles.statusLive}>● Live</Text>
            {busLocation.eta && (
              <Text style={styles.eta}>ETA: {Math.round(busLocation.eta / 60)} min</Text>
            )}
          </>
        ) : (
          <Text style={styles.statusInactive}>Route not active</Text>
        )}
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={loadMapData}>
        <Text style={styles.refreshButtonText}>🔄</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  loadingText: {
    marginTop: 10,
    color: '#94a3b8',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  busMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  busMarkerText: {
    fontSize: 24,
  },
  stopMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stopMarkerHighlight: {
    backgroundColor: '#3b82f6',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  stopMarkerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoPanel: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 15,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  childName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  routeName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  statusLive: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  statusInactive: {
    fontSize: 14,
    color: '#64748b',
  },
  eta: {
    fontSize: 14,
    color: '#1e293b',
    marginTop: 4,
  },
  refreshButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  refreshButtonText: {
    fontSize: 24,
  },
});
