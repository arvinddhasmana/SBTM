import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ParentApiService } from '../services/ParentApiService';
import LanguageSwitcher from '../components/LanguageSwitcher';

/**
 * Mirrors apps/parent-dashboard/web/src/pages/Settings.tsx.
 *
 * Server contract (notification-service):
 *   - Event types: BOARD, ALIGHT, EMERGENCY, ROUTE_DEVIATION, LATE_ARRIVAL
 *   - Channels:    PUSH, EMAIL, SMS
 *
 * The mobile UI exposes the same three customer-facing categories the web
 * portal does so parents see a consistent settings page on either platform.
 * EMERGENCY is locked-on for safety (the web portal treats it the same way).
 */
const EVENT_TYPES = [
  {
    key: 'BOARD',
    label: 'Child Boarded',
    description: 'When your child boards the bus',
    locked: false,
  },
  {
    key: 'ALIGHT',
    label: 'Child Alighted',
    description: 'When your child gets off the bus',
    locked: false,
  },
  {
    key: 'EMERGENCY',
    label: 'Emergency Alerts',
    description: "Safety alerts for your child's route",
    locked: true,
  },
] as const;

const CHANNELS = [
  { key: 'PUSH', label: 'Push', icon: '🔔' },
  { key: 'EMAIL', label: 'Email', icon: '✉️' },
] as const;

type EventKey = (typeof EVENT_TYPES)[number]['key'];
type ChannelKey = (typeof CHANNELS)[number]['key'];
type PrefMap = Record<string, Record<string, boolean>>;

function buildInitialPrefMap(
  rows: Array<{ eventType: string; channel: string; enabled: boolean }>,
): PrefMap {
  const map: PrefMap = {};
  for (const row of rows) {
    if (!map[row.eventType]) map[row.eventType] = {};
    map[row.eventType][row.channel] = row.enabled;
  }
  // Fill defaults for the canonical event types so the UI always shows them.
  for (const et of EVENT_TYPES) {
    if (!map[et.key]) map[et.key] = {};
    if (map[et.key]['PUSH'] === undefined) map[et.key]['PUSH'] = true;
    if (map[et.key]['EMAIL'] === undefined) map[et.key]['EMAIL'] = false;
  }
  // EMERGENCY is always on (matches web).
  map['EMERGENCY'] = { PUSH: true, EMAIL: true, SMS: true };
  return map;
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<PrefMap>(() => buildInitialPrefMap([]));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await ParentApiService.getNotificationPreferencesRaw();
        if (!cancelled) setPreferences(buildInitialPrefMap(rows));
      } catch (error) {
        console.warn('Failed to load preferences, using defaults:', error);
        if (!cancelled) setPreferences(buildInitialPrefMap([]));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = (eventType: EventKey, channel: ChannelKey) => {
    if (eventType === 'EMERGENCY') return;
    setPreferences((prev) => {
      const updated = { ...prev };
      if (!updated[eventType]) updated[eventType] = {};
      updated[eventType] = {
        ...updated[eventType],
        [channel]: !updated[eventType][channel],
      };
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const rows: Array<{ eventType: string; channel: string; enabled: boolean }> = [];
      for (const [eventType, channels] of Object.entries(preferences)) {
        for (const [channel, enabled] of Object.entries(channels)) {
          rows.push({ eventType, channel, enabled });
        }
      }
      await ParentApiService.updateNotificationPreferencesRaw(rows);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } catch (error: any) {
      Alert.alert(t('settings.errorTitle'), error?.message || t('settings.errorSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const eventCards = useMemo(
    () =>
      EVENT_TYPES.map((eventType) => (
        <View key={eventType.key} style={styles.eventCard} testID={`pref-card-${eventType.key}`}>
          <View style={styles.eventHeader}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>
                {eventType.locked ? '🛡️ ' : ''}
                {t(`profile.eventTypes.${eventType.key}.label`)}
              </Text>
              <Text style={styles.eventDescription}>
                {t(`profile.eventTypes.${eventType.key}.description`)}
              </Text>
            </View>
            {eventType.locked && (
              <View style={styles.alwaysOnBadge}>
                <Text style={styles.alwaysOnText}>{t('profile.alwaysOn')}</Text>
              </View>
            )}
          </View>

          <View style={styles.channelRow}>
            {CHANNELS.map((channel) => {
              const isEnabled = preferences[eventType.key]?.[channel.key] ?? false;
              const isLocked = eventType.locked;
              return (
                <TouchableOpacity
                  key={channel.key}
                  onPress={() => handleToggle(eventType.key, channel.key)}
                  disabled={isLocked || isSaving}
                  style={[
                    styles.channelChip,
                    isEnabled ? styles.channelChipOn : styles.channelChipOff,
                    isLocked && styles.channelChipLocked,
                  ]}
                  testID={`pref-${eventType.key}-${channel.key}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isEnabled, disabled: isLocked }}
                >
                  <Text
                    style={[
                      styles.channelChipText,
                      isEnabled ? styles.channelChipTextOn : styles.channelChipTextOff,
                    ]}
                  >
                    {channel.icon} {t(`profile.channels.${channel.key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )),
    [preferences, isSaving, t],
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#a5b4fc" />
        <Text style={styles.loadingText}>{t('settings.loadingSettings')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="settings-screen"
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>⚙️ {t('settings.title')}</Text>
        <LanguageSwitcher />
      </View>
      <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>

      {savedBanner && (
        <View style={styles.successBanner} testID="settings-saved-banner">
          <Text style={styles.successBannerText}>{t('settings.savedBanner')}</Text>
        </View>
      )}

      {eventCards}

      <TouchableOpacity
        style={[styles.button, isSaving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
        testID="settings-save"
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('profile.savePreferences')}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>{t('settings.appInfo')}</Text>
        <Text style={styles.appInfoText}>{t('settings.copyright')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1020',
  },
  loadingText: { marginTop: 10, color: '#94a3b8', fontSize: 16 },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  eventCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventInfo: { flex: 1, marginRight: 8 },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  eventDescription: { fontSize: 13, color: '#94a3b8' },
  alwaysOnBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  alwaysOnText: { color: '#fbbf24', fontSize: 11, fontWeight: '600' },
  channelRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  channelChipOn: {
    // Stronger fill + brighter border so the selected channel reads
    // unambiguously even at a glance on Android (previous translucent indigo
    // was too close to the unselected slate background).
    backgroundColor: '#6366f1',
    borderColor: '#a5b4fc',
    shadowColor: '#6366f1',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  channelChipOff: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  channelChipLocked: { opacity: 0.7 },
  channelChipText: { fontSize: 14, fontWeight: '700' },
  channelChipTextOn: { color: '#ffffff' },
  channelChipTextOff: { color: '#94a3b8' },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  appInfoText: { color: '#64748b', fontSize: 12, marginVertical: 2 },
  successBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  successBannerText: { color: '#86efac', fontSize: 14, fontWeight: '600' },
});
