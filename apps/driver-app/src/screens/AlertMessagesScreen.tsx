import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverStore } from '../store/useDriverStore';
import { AlertService, ActiveAlert, AuditLogEntry } from '../services/alert.service';

const GLASS_BG = 'rgba(15,23,42,0.82)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

interface AlertWithMessages extends ActiveAlert {
  auditLog: AuditLogEntry[];
  infoRequested: boolean;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  INFO_REQUESTED: { label: 'Info Requested', color: '#3b82f6' },
  STATUS_UPDATE: { label: 'Response', color: '#10b981' },
  CONFIRMED: { label: 'Confirmed', color: '#22c55e' },
  FALSE_ALARM: { label: 'False Alarm', color: '#ef4444' },
  RESOLVED: { label: 'Resolved', color: '#6b7280' },
  CREATED: { label: 'Created', color: '#f59e0b' },
  ESCALATED: { label: 'Escalated', color: '#ef4444' },
};

export default function AlertMessagesScreen() {
  const insets = useSafeAreaInsets();
  const activeRoute = useDriverStore((s) => s.activeRoute);
  const driver = useDriverStore((s) => s.driver);
  const [alerts, setAlerts] = useState<AlertWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});

  const fetchAlerts = useCallback(async () => {
    if (!activeRoute) return;
    try {
      const activeAlerts = await AlertService.getActiveAlerts(activeRoute.id);
      const enriched: AlertWithMessages[] = await Promise.all(
        activeAlerts.map(async (alert) => {
          const auditLog = await AlertService.getAlertAuditLog(alert.id);
          return {
            ...alert,
            auditLog,
            infoRequested: auditLog.some((e) => e.action === 'INFO_REQUESTED'),
          };
        }),
      );
      setAlerts(enriched);
    } catch (error) {
      console.error('Failed to fetch alerts', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeRoute]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const handleSendReply = async (alertId: string) => {
    const text = replyText[alertId]?.trim();
    if (!text) {
      Alert.alert('Empty Message', 'Please type a response before sending.');
      return;
    }
    setSending((prev) => ({ ...prev, [alertId]: true }));
    try {
      await AlertService.addStatusUpdate(alertId, text, driver?.id);
      setReplyText((prev) => ({ ...prev, [alertId]: '' }));
      Alert.alert('Sent', 'Your response has been sent to the admin.');
      await fetchAlerts();
    } catch {
      Alert.alert('Error', 'Failed to send response. Please try again.');
    } finally {
      setSending((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  const renderAuditEntry = (entry: AuditLogEntry) => {
    const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: '#6b7280' };
    const isDriverMessage = entry.actorRole === 'DRIVER';
    return (
      <View
        key={entry.id}
        style={[styles.msgRow, isDriverMessage ? styles.msgRight : styles.msgLeft]}
      >
        <View
          style={[
            styles.msgBubble,
            {
              backgroundColor: isDriverMessage ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
            },
          ]}
        >
          <Text style={[styles.msgAction, { color: meta.color }]}>{meta.label}</Text>
          {entry.notes ? <Text style={styles.msgText}>{entry.notes}</Text> : null}
          <Text style={styles.msgTime}>
            {new Date(entry.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {entry.actorRole ? ` · ${entry.actorRole}` : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderAlert = ({ item }: { item: AlertWithMessages }) => {
    const eventLabel = item.eventType.replace(/_/g, ' ');
    return (
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={[styles.alertBadge, item.infoRequested && styles.alertBadgeUrgent]}>
            <Text style={styles.alertBadgeText}>{eventLabel}</Text>
          </View>
          <Text style={styles.alertTime}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {item.description ? <Text style={styles.alertDesc}>{item.description}</Text> : null}

        {item.infoRequested && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>Admin has requested additional information</Text>
          </View>
        )}

        <View style={styles.msgThread}>
          {item.auditLog
            .filter((e) => e.action === 'INFO_REQUESTED' || e.action === 'STATUS_UPDATE')
            .map(renderAuditEntry)}
        </View>

        <View style={styles.replyRow}>
          <TextInput
            style={styles.replyInput}
            placeholder="Type a response..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={replyText[item.id] ?? ''}
            onChangeText={(text) => setReplyText((prev) => ({ ...prev, [item.id]: text }))}
            editable={!sending[item.id]}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, sending[item.id] && styles.sendBtnDisabled]}
            onPress={() => handleSendReply(item.id)}
            disabled={sending[item.id]}
          >
            {sending[item.id] ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerView, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.centerText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Text style={styles.header}>Alert Messages</Text>
      <Text style={styles.subHeader}>
        Active alerts for your route. Respond to admin info requests here.
      </Text>

      {alerts.length === 0 ? (
        <View style={styles.centerView}>
          <Text style={{ fontSize: 36 }}>✅</Text>
          <Text style={styles.centerText}>No active alerts on this route.</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 2,
  },
  subHeader: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  centerView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: 10,
  },
  centerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  list: {
    padding: 14,
    paddingBottom: 28,
  },
  alertCard: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 6,
  },
  alertBadge: {
    backgroundColor: 'rgba(245,158,11,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertBadgeUrgent: {
    backgroundColor: 'rgba(239,68,68,0.4)',
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  alertDesc: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  infoBanner: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    marginHorizontal: 14,
    marginBottom: 6,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  infoText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  msgThread: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  msgRow: {
    marginBottom: 6,
  },
  msgLeft: {
    alignItems: 'flex-start',
  },
  msgRight: {
    alignItems: 'flex-end',
  },
  msgBubble: {
    maxWidth: '85%',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  msgAction: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  msgText: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
  },
  msgTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 3,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  replyInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 80,
    color: '#fff',
  },
  sendBtn: {
    backgroundColor: 'rgba(0,122,255,0.4)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  refreshBtn: {
    backgroundColor: 'rgba(59,130,246,0.4)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  refreshText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
