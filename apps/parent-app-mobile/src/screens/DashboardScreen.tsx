import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useParentStore } from '../store/useParentStore';
import { Child, RootStackParamList } from '../types';
import {
  GlassCard,
  LoadingSpinner,
  StatusBadge,
  AuroraBackground,
  IconButton,
} from '../components';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_LABEL: Record<Child['status'], string> = {
  on_bus: 'On Bus',
  at_school: 'At School',
  at_home: 'At Home',
  unknown: 'Unknown',
};

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    user,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const greetingName = user?.firstName ?? 'there';
  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const onTimePct = 98;
  const tripsThisMonth = 12;
  const alertCount = activeAlerts.length;
  const firstAlert = activeAlerts[0];

  const renderChild = ({ item }: { item: Child }) => {
    const hasAlert = activeAlerts.some(
      (alert) => alert.routeId === item.amRouteId || alert.routeId === item.pmRouteId,
    );

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Track ${item.firstName} ${item.lastName}`}
        aria-label={`Track ${item.firstName} ${item.lastName}` as any}
        onPress={() => handleTrackChild(item)}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <GlassCard variant={hasAlert ? 'alert' : 'default'} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.firstName[0]}
                {item.lastName[0]}
              </Text>
            </View>

            <View style={styles.childInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.childName}>
                  {item.firstName} {item.lastName}
                </Text>
                <StatusBadge label={STATUS_LABEL[item.status]} variant={item.status} size="small" />
              </View>
              <Text style={styles.schoolName}>
                {item.schoolName}
                {item.grade ? ` · Grade ${item.grade}` : ''}
              </Text>
              <View style={styles.routeChips}>
                {!!item.amRouteName && (
                  <View style={[styles.routeChip, styles.routeChipAm]}>
                    <Text style={styles.routeChipText}>AM · {item.amRouteName}</Text>
                  </View>
                )}
                {!!item.pmRouteName && (
                  <View style={[styles.routeChip, styles.routeChipPm]}>
                    <Text style={styles.routeChipText}>PM · {item.pmRouteName}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.trackHint}>Tap to track on map →</Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </View>
        </GlassCard>
      </Pressable>
    );
  };

  if (isLoadingChildren && children.length === 0) {
    return (
      <AuroraBackground>
        <View style={styles.centerContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading children...</Text>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingWrap}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{greetingName[0]?.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hi, {greetingName}</Text>
              <Text style={styles.dateLabel}>{todayLabel}</Text>
            </View>
          </View>
          <View style={styles.iconRow}>
            <IconButton
              icon="🔔"
              showDot={alertCount > 0}
              accessibilityLabel="Notifications"
              testID="header-notifications"
              onPress={() => navigation.navigate('Notifications')}
            />
            <IconButton
              icon="⚙"
              accessibilityLabel="Settings"
              testID="header-settings"
              onPress={() => navigation.navigate('Settings')}
            />
            <IconButton
              icon="⎋"
              accessibilityLabel="Logout"
              testID="header-logout"
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* Alert summary chip */}
        {!!firstAlert && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.alertChip}
          >
            <Text style={styles.alertChipText}>
              {alertCount} alert{alertCount === 1 ? '' : 's'} · {firstAlert.description}
            </Text>
          </TouchableOpacity>
        )}

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
              tintColor="#a5b4fc"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No children linked to your account.</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{onTimePct}%</Text>
                <Text style={styles.statLabel}>on-time</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{tripsThisMonth}</Text>
                <Text style={styles.statLabel}>trips</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{alertCount}</Text>
                <Text style={styles.statLabel}>alert{alertCount === 1 ? '' : 's'}</Text>
              </View>
            </View>
          }
        />

        {/* FAB */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Report Absence"
          aria-label={'Report Absence' as any}
          style={styles.fab}
          onPress={() => navigation.navigate('AbsenceReport')}
        >
          <Text style={styles.fabIcon}>＋</Text>
          <Text style={styles.fabText}>Report Absence</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#cbd5e1',
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  greeting: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  dateLabel: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  alertChip: {
    marginHorizontal: 18,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.35)',
  },
  alertChipText: { color: '#fde68a', fontSize: 13 },
  listContent: { padding: 15, paddingBottom: 120 },
  card: { marginBottom: 14 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  childInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  childName: { color: '#f8fafc', fontSize: 17, fontWeight: '600', flexShrink: 1 },
  schoolName: { color: '#94a3b8', fontSize: 13, marginBottom: 6 },
  routeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  routeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  routeChipAm: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.4)',
  },
  routeChipPm: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.4)',
  },
  routeChipText: { color: '#e2e8f0', fontSize: 11, fontWeight: '500' },
  trackHint: { color: '#a5b4fc', fontSize: 12, marginTop: 2 },
  chevron: { color: '#cbd5e1', fontSize: 28, fontWeight: '300' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  statValue: { color: '#f8fafc', fontWeight: '700', fontSize: 18 },
  statLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    backgroundColor: '#6366f1',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#6366f1',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
