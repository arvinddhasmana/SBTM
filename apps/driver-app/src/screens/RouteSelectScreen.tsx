import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDriverStore } from '../store/useDriverStore';
import { Route } from '../types';

function formatStartTime(startTime?: string): string {
  if (!startTime) return '—';
  // Backend returns startTime as 'HH:mm' (e.g. '07:30')
  // We can just return it directly if it already contains a colon
  if (startTime.includes(':')) {
    // Optional: could turn '07:30' into '7:30 AM'
    const [h, m] = startTime.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const numHour = hour % 12 || 12;
    return `${numHour}:${m} ${ampm}`;
  }

  // Fallback in case it's actually an ISO string
  const date = new Date(startTime);
  if (isNaN(date.getTime())) return startTime;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function RouteSelectScreen({ navigation }: any) {
  const driver = useDriverStore((state) => state.driver);
  const setActiveRoute = useDriverStore((state) => state.setActiveRoute);

  const handleSelectRoute = (route: Route) => {
    Alert.alert('Start Route', `Start ${route.name} (${route.direction})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: () => {
          setActiveRoute(route);
          navigation.navigate('ActiveRoute');
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Route }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelectRoute(item)}>
      <Text style={styles.routeName}>{item.name}</Text>
      <Text style={styles.details}>School: {item.schoolName || item.schoolId}</Text>
      <Text style={styles.details}>Start: {formatStartTime(item.startTime)}</Text>
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

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => useDriverStore.getState().logout()}
      >
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
