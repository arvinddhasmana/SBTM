import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useParentStore } from '../store/useParentStore';
import { Child, RootStackParamList } from '../types';
import { GlassCard, GlassButton, LoadingSpinner, StatusBadge } from '../components';

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
      <GlassCard
        variant={hasAlert ? 'alert' : 'default'}
        style={styles.card}
      >
        <View style={styles.cardContent}>
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
          <StatusBadge
            label={getStatusLabel(item.status)}
            variant={item.status}
            size="small"
            style={styles.statusBadge}
          />

          {/* Track Button */}
          <GlassButton
            title="Track"
            onPress={() => handleTrackChild(item)}
            variant="primary"
            style={styles.trackButton}
          />
        </View>
      </GlassCard>
    );
  };

  if (isLoadingChildren && children.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading children...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.header}>
        <GlassButton
          title={`🔔 Alerts ${activeAlerts.length > 0 ? `(${activeAlerts.length})` : ''}`}
          onPress={() => navigation.navigate('Notifications')}
          variant="secondary"
          style={styles.headerButton}
        />

        <GlassButton
          title="📋 Report Absence"
          onPress={() => navigation.navigate('AbsenceReport')}
          variant="secondary"
          style={styles.headerButton}
        />

        <GlassButton
          title="⚙️ Settings"
          onPress={() => navigation.navigate('Settings')}
          variant="secondary"
          style={styles.headerButton}
        />

        <GlassButton
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.headerButton}
        />
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
  },
  listContent: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 10,
  },
  trackButton: {
    width: 80,
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
