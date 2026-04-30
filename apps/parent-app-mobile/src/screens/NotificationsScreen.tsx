import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ParentApiService } from '../services/ParentApiService';
import { Alert, AlertAuditEntry } from '../types';
import { AuroraBackground, IconButton, LoadingSpinner } from '../components';
import { auditEventLabel, auditEventColor } from '../utils/alerts';

type Severity = 'crit' | 'warn' | 'info' | 'ok';

const SEVERITY_COLOR: Record<Severity, string> = {
  crit: '#ef4444',
  warn: '#eab308',
  info: '#3b82f6',
  ok: '#22c55e',
};

function severityFor(alert: Alert): Severity {
  if (alert.eventType === 'PANIC_BUTTON' || alert.eventType === 'INCIDENT') return 'crit';
  if (alert.eventType === 'LATE_ARRIVAL' || alert.eventType === 'ROUTE_DEVIATION') return 'warn';
  if (alert.status === 'RESOLVED') return 'ok';
  return 'info';
}

function iconFor(alert: Alert): string {
  switch (alert.eventType) {
    case 'PANIC_BUTTON':
      return '🚨';
    case 'INCIDENT':
      return '⚠';
    case 'LATE_ARRIVAL':
      return '⏱';
    case 'ROUTE_DEVIATION':
      return '🛣';
    default:
      return alert.status === 'RESOLVED' ? '✓' : 'ℹ';
  }
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [auditTrails, setAuditTrails] = useState<Record<string, AlertAuditEntry[]>>({});
  const [loadingTrailFor, setLoadingTrailFor] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'today' | 'week'>('all');

  const toggleTimeline = useCallback(
    async (alertId: string) => {
      if (expandedAlertId === alertId) {
        setExpandedAlertId(null);
        return;
      }
      setExpandedAlertId(alertId);
      if (!auditTrails[alertId]) {
        setLoadingTrailFor(alertId);
        try {
          const trail = await ParentApiService.getAlertAuditTrail(alertId);
          // Sort newest first
          const sorted = [...trail].sort(
            (a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime(),
          );
          setAuditTrails((prev) => ({ ...prev, [alertId]: sorted }));
        } finally {
          setLoadingTrailFor((cur) => (cur === alertId ? null : cur));
        }
      }
    },
    [expandedAlertId, auditTrails],
  );

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

  const sections = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const now = Date.now();
    const filtered = alerts.filter((a) => {
      const age = now - new Date(a.timestamp).getTime();
      switch (filter) {
        case 'active':
          return a.status === 'ACTIVE';
        case 'today':
          return age < dayMs;
        case 'week':
          return age < weekMs;
        default:
          return true;
      }
    });
    const today: Alert[] = [];
    const earlier: Alert[] = [];
    filtered.forEach((a) => {
      if (now - new Date(a.timestamp).getTime() < dayMs) today.push(a);
      else earlier.push(a);
    });
    const out = [];
    if (today.length) out.push({ title: 'Today', data: today });
    if (earlier.length) out.push({ title: 'Earlier this week', data: earlier });
    return out;
  }, [alerts, filter]);

  const unreadCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  const renderAlert = ({ item }: { item: Alert }) => {
    const sev = severityFor(item);
    const stripe = SEVERITY_COLOR[sev];
    const isExpanded = expandedAlertId === item.id;
    const trail = auditTrails[item.id];
    const isLoadingTrail = loadingTrailFor === item.id;
    return (
      <View style={styles.notif} testID={`alert-card-${item.id}`}>
        <View style={[styles.stripe, { backgroundColor: stripe }]} />
        <View style={styles.notifBody}>
          <View style={styles.notifHeader}>
            <View
              style={[
                styles.iconTile,
                { backgroundColor: `${stripe}33`, borderColor: `${stripe}66` },
              ]}
            >
              <Text style={styles.iconTileText}>{iconFor(item)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{item.eventType.replace(/_/g, ' ')}</Text>
              <Text style={styles.notifTime}>{timeAgo(item.timestamp)}</Text>
            </View>
          </View>
          <Text style={styles.notifDesc}>{item.description}</Text>
          <View style={styles.notifMeta}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>Route {item.routeId}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>Bus {item.vehicleId}</Text>
            </View>
            <View style={[styles.metaChip, item.status === 'RESOLVED' && styles.metaChipOk]}>
              <Text style={styles.metaChipText}>{item.status}</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Hide timeline' : 'View timeline'}
            onPress={() => toggleTimeline(item.id)}
            style={({ pressed }) => [styles.timelineToggle, pressed && { opacity: 0.7 }]}
            testID={`timeline-toggle-${item.id}`}
          >
            <Text style={styles.timelineToggleText}>
              {isExpanded ? '▲ Hide timeline' : '▼ View timeline'}
            </Text>
          </Pressable>

          {isExpanded && (
            <View style={styles.timelineWrap} testID={`timeline-${item.id}`}>
              {isLoadingTrail && (
                <View style={styles.timelineLoading}>
                  <ActivityIndicator size="small" color="#a5b4fc" />
                  <Text style={styles.timelineLoadingText}>Loading timeline…</Text>
                </View>
              )}
              {!isLoadingTrail && trail && trail.length === 0 && (
                <Text style={styles.timelineEmpty}>No timeline events yet.</Text>
              )}
              {!isLoadingTrail &&
                trail &&
                trail.map((evt) => {
                  const color = auditEventColor(evt.eventType);
                  return (
                    <View key={evt.id} style={styles.timelineRow}>
                      <View style={styles.timelineDotCol}>
                        <View style={[styles.timelineDot, { backgroundColor: color }]} />
                        <View style={styles.timelineLine} />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineEventLabel, { color }]}>
                          {auditEventLabel(evt.eventType)}
                        </Text>
                        <Text style={styles.timelineTime}>
                          {timeAgo(evt.eventTimestamp)}
                          {evt.actorName ? ` · ${evt.actorName}` : ''}
                        </Text>
                        {!!evt.notes && <Text style={styles.timelineNotes}>{evt.notes}</Text>}
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <AuroraBackground>
        <View style={styles.centerContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <SafeAreaView style={styles.safe} edges={['top']} testID="notifications-screen">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton icon="‹" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.title}>Alerts</Text>
              <Text style={styles.subtitle}>
                {unreadCount} unread · {alerts.length} total
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <IconButton icon="⌕" accessibilityLabel="Filter" onPress={() => {}} />
            <IconButton icon="✓" accessibilityLabel="Mark all read" onPress={() => {}} />
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow} testID="notifications-filter-row">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This week' },
            ] as const
          ).map((chip) => {
            const active = filter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                testID={`notifications-filter-${chip.key}`}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
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
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptySubtitle}>
                You'll see safety alerts and notifications here
              </Text>
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
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  listContent: { padding: 15, paddingBottom: 40 },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  notif: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stripe: { width: 4 },
  notifBody: { flex: 1, padding: 14 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconTileText: { fontSize: 16 },
  notifTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  notifTime: { color: '#94a3b8', fontSize: 11, marginTop: 1 },
  notifDesc: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  notifMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metaChipOk: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderColor: 'rgba(34,197,94,0.4)',
  },
  metaChipText: { color: '#e2e8f0', fontSize: 10, fontWeight: '500' },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 4,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderColor: 'rgba(99,102,241,0.5)',
  },
  filterChipText: { color: '#cbd5e1', fontSize: 12, fontWeight: '500' },
  filterChipTextActive: { color: '#a5b4fc', fontWeight: '700' },

  timelineToggle: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
  },
  timelineToggleText: { color: '#a5b4fc', fontSize: 12, fontWeight: '600' },
  timelineWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  timelineLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineLoadingText: { color: '#94a3b8', fontSize: 12 },
  timelineEmpty: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic' },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineDotCol: { alignItems: 'center', width: 14 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  timelineContent: { flex: 1, paddingBottom: 12 },
  timelineEventLabel: { fontSize: 12, fontWeight: '700' },
  timelineTime: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  timelineNotes: { color: '#cbd5e1', fontSize: 12, marginTop: 4, lineHeight: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 60, marginBottom: 15 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
});
