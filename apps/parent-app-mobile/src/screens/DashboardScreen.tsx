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
import { useTranslation } from 'react-i18next';
import { useParentStore } from '../store/useParentStore';
import { Child, RootStackParamList, Alert } from '../types';
import {
  GlassCard,
  LoadingSpinner,
  StatusBadge,
  AuroraBackground,
  IconButton,
} from '../components';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { ALERT_POLL_INTERVAL_MS, DASHBOARD_LIVE_LOCATION_POLL_MS } from '../config/constants';
import {
  alertEventLabel,
  alertEventEmoji,
  affectedChildren,
  childMatchesAlert,
} from '../utils/alerts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const {
    user,
    children,
    activeAlerts,
    isLoadingChildren,
    routeLiveLocations,
    refreshChildren,
    refreshAlerts,
    refreshLiveLocations,
    logout,
  } = useParentStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
    loadData();
    const alertTimer = setInterval(() => {
      refreshAlerts().catch(() => {});
    }, ALERT_POLL_INTERVAL_MS);
    const locTimer = setInterval(() => {
      refreshLiveLocations().catch(() => {});
    }, DASHBOARD_LIVE_LOCATION_POLL_MS);
    // Periodically refresh children so the server-side presence status
    // (on_bus / at_school / at_home) stays current — mirrors the web
    // portal which polls /parent/children every 15 s.
    const childrenTimer = setInterval(() => {
      refreshChildren().catch(() => {});
    }, ALERT_POLL_INTERVAL_MS);
    return () => {
      clearInterval(alertTimer);
      clearInterval(locTimer);
      clearInterval(childrenTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      await refreshChildren();
      await Promise.all([refreshAlerts(), refreshLiveLocations()]);
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

  const alertCount = activeAlerts.length;

  const renderAlertBanner = (alert: Alert) => {
    const affected = affectedChildren(alert, children);
    const sev = alert.eventType === 'PANIC_BUTTON' || alert.eventType === 'INCIDENT';
    return (
      <TouchableOpacity
        key={alert.id}
        accessibilityRole="button"
        accessibilityLabel={`${alertEventLabel(alert.eventType)} alert`}
        onPress={() => navigation.navigate('Notifications')}
        style={[styles.alertBanner, sev && styles.alertBannerCrit]}
        testID={`alert-banner-${alert.id}`}
      >
        <View style={styles.alertBannerHeader}>
          <Text style={styles.alertBannerEmoji}>{alertEventEmoji(alert.eventType)}</Text>
          <Text style={styles.alertBannerTitle}>{alertEventLabel(alert.eventType)}</Text>
          <View style={styles.alertBannerBadge}>
            <Text style={styles.alertBannerBadgeText}>{alert.status}</Text>
          </View>
        </View>
        <View style={styles.alertBannerChips}>
          {!!alert.vehicleId && (
            <View style={styles.alertChipSmall}>
              <Text style={styles.alertChipSmallText}>
                {t('children.vehicleLabel', { id: alert.vehicleId })}
              </Text>
            </View>
          )}
          {!!alert.routeId && (
            <View style={styles.alertChipSmall}>
              <Text style={styles.alertChipSmallText}>
                {t('notifications.routeLabel', { id: alert.routeId })}
              </Text>
            </View>
          )}
        </View>
        {!!alert.description && (
          <Text style={styles.alertBannerDesc} numberOfLines={3}>
            {alert.description}
          </Text>
        )}
        {affected.length > 0 && (
          <Text style={styles.alertBannerAffected}>
            {t('children.affectedLabel', {
              names: affected.map((c) => `${c.firstName} ${c.lastName}`).join(', '),
            })}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderChild = ({ item }: { item: Child }) => {
    const childAlerts = activeAlerts.filter((a) => childMatchesAlert(item, a));
    const hasAlert = childAlerts.length > 0;
    // Use the server-provided presence status directly (mirrors the web
    // portal's Dashboard — it does not derive the badge from live GPS).
    // Normalize to lowercase so legacy fixtures that send "ON_BUS" still
    // resolve to a known label.
    const rawStatus = (item.status ?? 'unknown') as string;
    const status =
      (rawStatus.toLowerCase() as Child['status']) in
      { on_bus: 1, at_school: 1, at_home: 1, unknown: 1 }
        ? (rawStatus.toLowerCase() as Child['status'])
        : 'unknown';
    const statusLabelMap: Record<string, string> = {
      on_bus: t('children.status.onBus'),
      at_school: t('children.status.atSchool'),
      at_home: t('children.status.atHome'),
      unknown: t('children.status.unknown'),
    };
    const liveAm = item.amRouteId ? routeLiveLocations[item.amRouteId] : undefined;
    const livePm = item.pmRouteId ? routeLiveLocations[item.pmRouteId] : undefined;
    const live = liveAm ?? livePm;
    const etaMin =
      live && live.eta != null && Number.isFinite(live.eta)
        ? Math.max(0, Math.round(live.eta / 60))
        : null;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Track ${item.firstName} ${item.lastName}`}
        aria-label={`Track ${item.firstName} ${item.lastName}` as any}
        onPress={() => handleTrackChild(item)}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        testID={`student-card-${item.id}`}
      >
        <GlassCard variant={hasAlert ? 'alert' : 'default'} style={styles.card}>
          {hasAlert && (
            <View style={styles.cardAlertRibbon}>
              <Text style={styles.cardAlertRibbonText}>
                {t('children.alertBadge', { count: childAlerts.length })}
              </Text>
            </View>
          )}
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
                <View testID={`child-status-${item.id}`}>
                  <StatusBadge
                    label={statusLabelMap[status] ?? t('children.status.unknown')}
                    variant={status}
                    size="small"
                  />
                </View>
              </View>
              <Text style={styles.schoolName}>
                {item.schoolName || t('children.details.school')}
                {item.grade ? ` · ${t('children.gradeLabel', { grade: item.grade })}` : ''}
              </Text>
              <View style={styles.routeChips}>
                {!!(item.amRouteName || item.amRouteId) && (
                  <View style={[styles.routeChip, styles.routeChipAm]}>
                    <Text style={styles.routeChipText}>
                      AM · {item.amRouteName ?? item.amRouteId}
                    </Text>
                  </View>
                )}
                {!!(item.pmRouteName || item.pmRouteId) && (
                  <View style={[styles.routeChip, styles.routeChipPm]}>
                    <Text style={styles.routeChipText}>
                      PM · {item.pmRouteName ?? item.pmRouteId}
                    </Text>
                  </View>
                )}
                {!!item.vehicleId && (
                  <View style={[styles.routeChip, styles.routeChipBus]}>
                    <Text style={styles.routeChipText}>
                      {t('children.vehicleLabel', { id: item.vehicleId })}
                    </Text>
                  </View>
                )}
              </View>
              {!!item.stopName && (
                <Text style={styles.metaLine}>
                  {t('children.stopLabel', { name: item.stopName })}
                </Text>
              )}
              {etaMin != null && status === 'on_bus' && (
                <Text style={styles.metaLine}>
                  {t('children.details.bus')}{' '}
                  {etaMin === 0
                    ? t('children.arrivingNow')
                    : t('children.arrivingIn', { minutes: etaMin })}
                </Text>
              )}
              <Text style={styles.trackHint}>{t('children.trackHint')}</Text>
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
          <Text style={styles.loadingText}>{t('children.loadingChildren')}</Text>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <SafeAreaView style={styles.safe} edges={['top']} testID="dashboard-screen">
        <View style={styles.header}>
          <View style={styles.greetingWrap}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{greetingName[0]?.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>{t('children.greeting', { name: greetingName })}</Text>
              <Text style={styles.dateLabel}>{todayLabel}</Text>
            </View>
          </View>
          <View style={styles.iconRow}>
            <LanguageSwitcher />
            <IconButton
              icon="🗓"
              accessibilityLabel="Report Absence"
              testID="report-absence-fab"
              onPress={() => navigation.navigate('AbsenceReport')}
            />
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

        <FlatList
          data={children}
          renderItem={renderChild}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            activeAlerts.length > 0 ? (
              <View style={styles.alertsBlock} testID="active-alerts-block">
                <Text style={styles.alertsBlockTitle}>
                  {t('children.activeAlerts', { count: alertCount })}
                </Text>
                {activeAlerts.map(renderAlertBanner)}
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#a5b4fc"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('children.noChildrenLinked')}</Text>
            </View>
          }
        />
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#cbd5e1', fontSize: 16 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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

  alertsBlock: { marginBottom: 6 },
  alertsBlockTitle: {
    color: '#fda4af',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontWeight: '700',
  },
  alertBanner: {
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(236,72,153,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.45)',
  },
  alertBannerCrit: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.55)',
  },
  alertBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertBannerEmoji: { fontSize: 16 },
  alertBannerTitle: { color: '#fecdd3', fontWeight: '700', fontSize: 14, flex: 1 },
  alertBannerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  alertBannerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  alertBannerChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  alertChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  alertChipSmallText: { color: '#e2e8f0', fontSize: 10, fontWeight: '600' },
  alertBannerDesc: { color: '#fee2e2', fontSize: 13, lineHeight: 18, marginBottom: 4 },
  alertBannerAffected: { color: '#fda4af', fontSize: 12, fontStyle: 'italic' },

  listContent: { padding: 15, paddingBottom: 120 },
  card: { marginBottom: 14 },
  cardAlertRibbon: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(236,72,153,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.5)',
  },
  cardAlertRibbonText: { color: '#fda4af', fontSize: 11, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  routeChipBus: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: 'rgba(139,92,246,0.4)',
  },
  routeChipText: { color: '#e2e8f0', fontSize: 11, fontWeight: '500' },
  metaLine: { color: '#cbd5e1', fontSize: 12, marginTop: 1 },
  trackHint: { color: '#a5b4fc', fontSize: 12, marginTop: 4 },
  chevron: { color: '#cbd5e1', fontSize: 28, fontWeight: '300' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
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
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
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
