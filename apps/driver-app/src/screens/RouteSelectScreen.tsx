import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverStore } from '../store/useDriverStore';
import { Route } from '../types';

const GLASS_BG = 'rgba(15,23,42,0.82)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

function formatStartTime(startTime?: string): string {
  if (!startTime) return '—';
  if (startTime.includes(':')) {
    const [h, m] = startTime.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const numHour = hour % 12 || 12;
    return `${numHour}:${m} ${ampm}`;
  }
  const date = new Date(startTime);
  if (isNaN(date.getTime())) return startTime;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function RouteSelectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
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
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectRoute(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.routeName}>{item.name}</Text>
        <View style={[styles.dirBadge, item.direction === 'AM' ? styles.dirAM : styles.dirPM]}>
          <Text style={styles.dirText}>{item.direction}</Text>
        </View>
      </View>
      <Text style={styles.details}>School: {item.schoolName || item.schoolId}</Text>
      <Text style={styles.details}>Start: {formatStartTime(item.startTime)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
    padding: 16,
    backgroundColor: '#0f172a',
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    marginTop: 12,
  },
  subHeader: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  dirBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dirAM: { backgroundColor: 'rgba(59,130,246,0.4)' },
  dirPM: { backgroundColor: 'rgba(245,158,11,0.4)' },
  dirText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  details: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
  },
  logoutButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});
