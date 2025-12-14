import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useDriverStore } from '../store/useDriverStore';
import { Route } from '../types';

export default function RouteSelectScreen({ navigation }: any) {
    const driver = useDriverStore((state) => state.driver);
    const setActiveRoute = useDriverStore((state) => state.setActiveRoute);

    const handleSelectRoute = (route: Route) => {
        setActiveRoute(route);
        // Navigation will be handled by the stack navigator reacting to state change or explicit push?
        // Let's use explicit push for now or let the main navigator redirect if we want strict flow.
        // For this simple stack, we can just navigate.
        navigation.navigate('ActiveRoute');
    };

    const renderItem = ({ item }: { item: Route }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleSelectRoute(item)}>
            <Text style={styles.routeName}>{item.name}</Text>
            <Text style={styles.details}>School: {item.schoolId}</Text>
            <Text style={styles.details}>Start: {new Date(item.startTime).toLocaleTimeString()}</Text>
            <Text style={styles.direction}>{item.direction}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Welcome, {driver?.name}</Text>
            <Text style={styles.subHeader}>Select a route to start:</Text>

            <FlatList
                data={driver?.assignedRoutes || []}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />

            <TouchableOpacity style={styles.logoutButton} onPress={() => useDriverStore.getState().logout()}>
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 20,
    },
    subHeader: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    routeName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    details: {
        fontSize: 14,
        color: '#555',
        marginBottom: 2,
    },
    direction: {
        position: 'absolute',
        top: 20,
        right: 20,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    logoutButton: {
        marginTop: 20,
        alignSelf: 'center',
        padding: 10,
    },
    logoutText: {
        color: '#FF3B30',
        fontSize: 16,
    },
});
