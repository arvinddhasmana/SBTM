import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useDriverStore } from '../store/useDriverStore';
import { GPSService } from '../services/gps.service';
import { EmergencyService } from '../services/emergency.service';

export default function ActiveRouteScreen({ navigation }: any) {
    const activeRoute = useDriverStore((state) => state.activeRoute);
    const driver = useDriverStore((state) => state.driver);
    const endRoute = useDriverStore((state) => state.endRoute);

    const [region, setRegion] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    useEffect(() => {
        startGps();
        return () => {
            GPSService.stopTracking();
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

            if (activeRoute && driver) {
                // In a real app, vehicleId comes from selection or assignment. Hardcoding for MVP.
                await GPSService.startTracking(activeRoute.id, 'bus-123', driver.id);
            }
        } catch (e: any) {
            Alert.alert('GPS Error', e.message);
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
                        'bus-123',
                        activeRoute?.id || 'unknown',
                        { lat: loc.coords.latitude, lng: loc.coords.longitude },
                        driver?.id
                    );
                    Alert.alert('Alert Sent', 'Help is on the way.');
                }
            }
        ]);
    };

    const handleEndRoute = () => {
        endRoute();
        navigation.popToTop();
    };

    if (!activeRoute) return <View style={styles.center}><Text>No Active Route</Text></View>;

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
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.button, styles.rosterButton]}
                        onPress={() => navigation.navigate('Roster')}
                    >
                        <Text style={styles.buttonText}>Roster</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.endButton]}
                        onPress={handleEndRoute}
                    >
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
