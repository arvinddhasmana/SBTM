import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ParentApiService } from '../services/ParentApiService';
import { Alert } from '../types';

export default function NotificationsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const alertHistory = await ParentApiService.getAlertHistory();
      setAlerts(alertHistory);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAlerts();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'PANIC_BUTTON':
        return '#ef4444';
      case 'LATE_ARRIVAL':
        return '#f59e0b';
      case 'ROUTE_DEVIATION':
        return '#f97316';
      case 'INCIDENT':
        return '#ec4899';
      default:
        return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#ec4899';
      case 'RESOLVED':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => {
    return (
      <View
        style={[
          styles.card,
          item.status === 'ACTIVE' && styles.cardActive,
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.eventTypeBadge,
              { backgroundColor: getEventTypeColor(item.eventType) },
            ]}
          >
            <Text style={styles.eventTypeText}>
              {item.eventType.replace('_', ' ')}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.metadata}>
          <Text style={styles.metadataText}>Route: {item.routeId}</Text>
          <Text style={styles.metadataText}>Bus: {item.vehicleId}</Text>
          <Text style={styles.metadataText}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        renderItem={renderAlert}
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
            <Text style={styles.emptyText}>🔔</Text>
            <Text style={styles.emptyTitle}>No alerts yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll see safety alerts and notifications here
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
  },
  cardActive: {
    borderColor: '#ec4899',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eventTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  metadata: {
    gap: 4,
  },
  metadataText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
});
