import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useParentStore } from '../store/useParentStore';
import { Child, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    children,
    activeAlerts,
    isLoadingChildren,
    refreshChildren,
    refreshAlerts,
    logout,
  } = useParentStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([refreshChildren(), refreshAlerts()]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleTrackChild = (child: Child) => {
    navigation.navigate('Map', { childId: child.id });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getStatusColor = (status: Child['status']) => {
    switch (status) {
      case 'on_bus':
        return '#6366f1';
      case 'at_school':
        return '#10b981';
      case 'at_home':
        return '#64748b';
      default:
        return '#f59e0b';
    }
  };

  const getStatusLabel = (status: Child['status']) => {
    switch (status) {
      case 'on_bus':
        return 'On Bus';
      case 'at_school':
        return 'At School';
      case 'at_home':
        return 'At Home';
      default:
        return 'Unknown';
    }
  };

  const renderChild = ({ item }: { item: Child }) => {
    const hasAlert = activeAlerts.some(
      (alert) =>
        alert.routeId === item.amRouteId || alert.routeId === item.pmRouteId
    );

    return (
      <View style={[styles.card, hasAlert && styles.cardAlert]}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.firstName[0]}{item.lastName[0]}
          </Text>
        </View>

        {/* Child Info */}
        <View style={styles.childInfo}>
          <Text style={styles.childName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.schoolName}>{item.schoolName}</Text>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>
              AM: {item.amRouteName || 'N/A'}
            </Text>
            <Text style={styles.routeLabel}>
              PM: {item.pmRouteName || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>

        {/* Track Button */}
        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => handleTrackChild(item)}
        >
          <Text style={styles.trackButtonText}>Track</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoadingChildren && children.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading children...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.headerButtonText}>🔔 Alerts</Text>
          {activeAlerts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeAlerts.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('AbsenceReport')}
        >
          <Text style={styles.headerButtonText}>📋 Report Absence</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.headerButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Children List */}
      <FlatList
        data={children}
        renderItem={renderChild}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No children linked to your account.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
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
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 10,
  },
  headerButton: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    flex: 1,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAlert: {
    borderColor: '#ec4899',
    borderWidth: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  schoolName: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 6,
  },
  routeInfo: {
    flexDirection: 'row',
    gap: 10,
  },
  routeLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});
