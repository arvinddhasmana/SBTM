import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { ParentApiService } from '../services/ParentApiService';
import { Alert } from '../types';
import { GlassCard, LoadingSpinner, StatusBadge } from '../components';

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

  const getEventTypeBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'PANIC_BUTTON':
      case 'INCIDENT':
        return 'danger';
      case 'LATE_ARRIVAL':
      case 'ROUTE_DEVIATION':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'danger';
      case 'RESOLVED':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => {
    return (
      <GlassCard
        variant={item.status === 'ACTIVE' ? 'alert' : 'default'}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <StatusBadge
            label={item.eventType.replace('_', ' ')}
            variant={getEventTypeBadgeVariant(item.eventType)}
            size="small"
          />
          <StatusBadge
            label={item.status}
            variant={getStatusBadgeVariant(item.status)}
            size="small"
          />
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.metadata}>
          <Text style={styles.metadataText}>Route: {item.routeId}</Text>
          <Text style={styles.metadataText}>Bus: {item.vehicleId}</Text>
          <Text style={styles.metadataText}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
      </GlassCard>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <LoadingSpinner size="large" />
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
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
