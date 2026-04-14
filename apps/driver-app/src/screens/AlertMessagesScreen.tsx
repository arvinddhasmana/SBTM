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
} from 'react-native';
import { useDriverStore } from '../store/useDriverStore';
import { AlertService, ActiveAlert, AuditLogEntry } from '../services/alert.service';

interface AlertWithMessages extends ActiveAlert {
  auditLog: AuditLogEntry[];
  infoRequested: boolean;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  INFO_REQUESTED: { label: '📋 Info Requested', color: '#3b82f6' },
  STATUS_UPDATE: { label: '💬 Response', color: '#10b981' },
  CONFIRMED: { label: '✅ Confirmed', color: '#22c55e' },
  FALSE_ALARM: { label: '🚫 False Alarm', color: '#ef4444' },
  RESOLVED: { label: '✔️ Resolved', color: '#6b7280' },
  CREATED: { label: '🔔 Created', color: '#f59e0b' },
  ESCALATED: { label: '⬆️ Escalated', color: '#ef4444' },
};

export default function AlertMessagesScreen() {
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
    // Poll every 15 seconds for new messages
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
      await fetchAlerts(); // Refresh to show the new message
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
        style={[styles.messageRow, isDriverMessage ? styles.messageRight : styles.messageLeft]}
      >
        <View
          style={[
            styles.messageBubble,
            { backgroundColor: isDriverMessage ? '#dcfce7' : '#dbeafe' },
          ]}
        >
          <Text style={[styles.messageAction, { color: meta.color }]}>{meta.label}</Text>
          {entry.notes ? <Text style={styles.messageText}>{entry.notes}</Text> : null}
          <Text style={styles.messageTime}>
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
          <View style={[styles.alertTypeBadge, item.infoRequested && styles.alertTypeBadgeUrgent]}>
            <Text style={styles.alertTypeText}>{eventLabel}</Text>
          </View>
          <Text style={styles.alertTime}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {item.description ? <Text style={styles.alertDescription}>{item.description}</Text> : null}

        {item.infoRequested && (
          <View style={styles.infoRequestBanner}>
            <Text style={styles.infoRequestText}>
              ℹ️ Admin has requested additional information
            </Text>
          </View>
        )}

        {/* Message thread */}
        <View style={styles.messageThread}>
          {item.auditLog
            .filter((e) => e.action === 'INFO_REQUESTED' || e.action === 'STATUS_UPDATE')
            .map(renderAuditEntry)}
        </View>

        {/* Reply input */}
        <View style={styles.replyRow}>
          <TextInput
            style={styles.replyInput}
            placeholder="Type a response…"
            placeholderTextColor="#999"
            value={replyText[item.id] ?? ''}
            onChangeText={(text) => setReplyText((prev) => ({ ...prev, [item.id]: text }))}
            editable={!sending[item.id]}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, sending[item.id] && styles.sendButtonDisabled]}
            onPress={() => handleSendReply(item.id)}
            disabled={sending[item.id]}
          >
            {sending[item.id] ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.centerText}>Loading alerts…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Alert Messages</Text>
      <Text style={styles.subHeader}>
        Active alerts for your route. Respond to admin info requests here.
      </Text>

      {alerts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.centerText}>No active alerts on this route.</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    paddingBottom: 4,
    backgroundColor: '#fff',
  },
  subHeader: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  centerText: {
    fontSize: 16,
    color: '#555',
  },
  emptyIcon: {
    fontSize: 40,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  // Alert card
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  alertTypeBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  alertTypeBadgeUrgent: {
    backgroundColor: '#ef4444',
  },
  alertTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 13,
    color: '#999',
  },
  alertDescription: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 14,
    color: '#333',
  },
  infoRequestBanner: {
    backgroundColor: '#dbeafe',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },
  infoRequestText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '600',
  },
  // Message thread
  messageThread: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  messageRow: {
    marginBottom: 8,
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 10,
    borderRadius: 12,
  },
  messageAction: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  // Reply
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: '#1a1a1a',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
