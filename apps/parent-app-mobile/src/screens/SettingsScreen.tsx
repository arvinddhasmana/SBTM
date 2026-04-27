import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ParentApiService } from '../services/ParentApiService';
import {
  NotificationPreferences,
  NotificationEventType,
  NotificationChannel,
} from '../types';

export default function SettingsScreen() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await ParentApiService.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      // Set default preferences if loading fails
      setPreferences({
        userId: '',
        events: [
          {
            eventType: 'CHILD_BOARDED',
            channels: ['PUSH'],
            enabled: true,
          },
          {
            eventType: 'CHILD_ALIGHTED',
            channels: ['PUSH'],
            enabled: true,
          },
          {
            eventType: 'EMERGENCY_ALERT',
            channels: ['PUSH', 'EMAIL'],
            enabled: true,
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChannel = (
    eventType: NotificationEventType,
    channel: NotificationChannel
  ) => {
    if (!preferences) return;

    // Don't allow disabling emergency alerts
    if (eventType === 'EMERGENCY_ALERT') {
      Alert.alert(
        'Cannot Modify',
        'Emergency alerts are always enabled for safety.'
      );
      return;
    }

    const updatedEvents = preferences.events.map((event) => {
      if (event.eventType === eventType) {
        const hasChannel = event.channels.includes(channel);
        return {
          ...event,
          channels: hasChannel
            ? event.channels.filter((c) => c !== channel)
            : [...event.channels, channel],
        };
      }
      return event;
    });

    setPreferences({ ...preferences, events: updatedEvents });
  };

  const handleSave = async () => {
    if (!preferences) return;

    setIsSaving(true);

    try {
      await ParentApiService.updateNotificationPreferences(preferences);
      Alert.alert('Success', 'Notification preferences saved successfully.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to save preferences. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getEventLabel = (eventType: NotificationEventType): string => {
    switch (eventType) {
      case 'CHILD_BOARDED':
        return 'Child Boarded';
      case 'CHILD_ALIGHTED':
        return 'Child Alighted';
      case 'EMERGENCY_ALERT':
        return 'Emergency Alerts';
      case 'BUS_APPROACHING':
        return 'Bus Approaching';
      case 'ROUTE_CHANGE':
        return 'Route Change';
      case 'ABSENCE_CONFIRMED':
        return 'Absence Confirmed';
      default:
        return eventType;
    }
  };

  const getEventDescription = (eventType: NotificationEventType): string => {
    switch (eventType) {
      case 'CHILD_BOARDED':
        return 'When your child boards the bus';
      case 'CHILD_ALIGHTED':
        return 'When your child gets off the bus';
      case 'EMERGENCY_ALERT':
        return 'Safety alerts for your child\'s route';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load preferences</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⚙️ Notification Settings</Text>
      <Text style={styles.subtitle}>
        Choose how you want to be notified about your child's bus activity.
      </Text>

      {preferences.events.map((event) => (
        <View key={event.eventType} style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>
                {getEventLabel(event.eventType)}
              </Text>
              <Text style={styles.eventDescription}>
                {getEventDescription(event.eventType)}
              </Text>
            </View>

            {event.eventType === 'EMERGENCY_ALERT' && (
              <View style={styles.alwaysOnBadge}>
                <Text style={styles.alwaysOnText}>🛡️ Always On</Text>
              </View>
            )}
          </View>

          <View style={styles.channelToggles}>
            <View style={styles.channelToggle}>
              <Text style={styles.channelLabel}>🔔 Push</Text>
              <Switch
                value={event.channels.includes('PUSH')}
                onValueChange={() => toggleChannel(event.eventType, 'PUSH')}
                trackColor={{ false: '#374151', true: '#6366f1' }}
                thumbColor={event.channels.includes('PUSH') ? '#fff' : '#9ca3af'}
                disabled={event.eventType === 'EMERGENCY_ALERT'}
              />
            </View>

            <View style={styles.channelToggle}>
              <Text style={styles.channelLabel}>✉️ Email</Text>
              <Switch
                value={event.channels.includes('EMAIL')}
                onValueChange={() => toggleChannel(event.eventType, 'EMAIL')}
                trackColor={{ false: '#374151', true: '#6366f1' }}
                thumbColor={event.channels.includes('EMAIL') ? '#fff' : '#9ca3af'}
                disabled={event.eventType === 'EMERGENCY_ALERT'}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.button, isSaving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Preferences</Text>
        )}
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>SBTM Parent App v1.0.0</Text>
        <Text style={styles.appInfoText}>© 2026 SBTM</Text>
      </View>
    </ScrollView>
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
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 30,
  },
  eventCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventHeader: {
    marginBottom: 15,
  },
  eventInfo: {
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#94a3b8',
  },
  alwaysOnBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  alwaysOnText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  channelToggles: {
    gap: 10,
  },
  channelToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  channelLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  appInfoText: {
    color: '#64748b',
    fontSize: 12,
    marginVertical: 2,
  },
});
