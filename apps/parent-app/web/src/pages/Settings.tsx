import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parentApi } from '../services/api';
import type { NotificationPreference } from '../types';
import { Settings as SettingsIcon, Bell, Mail, MessageSquare, Shield } from 'lucide-react';

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
  { key: 'PUSH', label: 'Push', icon: Bell },
  { key: 'EMAIL', label: 'Email', icon: Mail },
] as const;

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<Record<string, Record<string, boolean>>>({});

  const { data: savedPrefs, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => parentApi.getNotificationPreferences(),
  });

  useEffect(() => {
    if (savedPrefs) {
      const prefMap: Record<string, Record<string, boolean>> = {};
      for (const pref of savedPrefs) {
        if (!prefMap[pref.eventType]) prefMap[pref.eventType] = {};
        prefMap[pref.eventType][pref.channel] = pref.enabled;
      }
      // Default PUSH to true for BOARD/ALIGHT if not set
      for (const et of EVENT_TYPES) {
        if (!prefMap[et.key]) prefMap[et.key] = {};
        if (prefMap[et.key]['PUSH'] === undefined) prefMap[et.key]['PUSH'] = true;
        if (prefMap[et.key]['EMAIL'] === undefined) prefMap[et.key]['EMAIL'] = false;
      }
      // EMERGENCY is always on
      prefMap['EMERGENCY'] = { PUSH: true, EMAIL: true, SMS: true };
      setPreferences(prefMap);
    }
  }, [savedPrefs]);

  const updateMutation = useMutation({
    mutationFn: (prefs: NotificationPreference[]) => parentApi.updateNotificationPreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const handleToggle = (eventType: string, channel: string) => {
    if (eventType === 'EMERGENCY') return;

    setPreferences((prev) => {
      const updated = { ...prev };
      if (!updated[eventType]) updated[eventType] = {};
      updated[eventType] = { ...updated[eventType], [channel]: !updated[eventType][channel] };
      return updated;
    });
  };

  const handleSave = () => {
    const prefs: NotificationPreference[] = [];
    for (const [eventType, channels] of Object.entries(preferences)) {
      for (const [channel, enabled] of Object.entries(channels)) {
        prefs.push({ eventType, channel, enabled });
      }
    }
    updateMutation.mutate(prefs);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-indigo-400" />
          Notification Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Choose how you want to be notified about your child's bus activity.
        </p>
      </div>

      <div className="space-y-4">
        {EVENT_TYPES.map((eventType) => (
          <div key={eventType.key} className="glass-card rounded-xl p-5 border border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  {eventType.locked && <Shield className="h-4 w-4 text-amber-400" />}
                  {eventType.label}
                </h3>
                <p className="text-sm text-slate-400">{eventType.description}</p>
              </div>
              {eventType.locked && (
                <span className="text-xs bg-amber-900/30 text-amber-300 px-2 py-1 rounded-full border border-amber-500/20">
                  Always On
                </span>
              )}
            </div>

            <div className="flex gap-4 mt-3">
              {CHANNELS.map((channel) => {
                const isEnabled = preferences[eventType.key]?.[channel.key] ?? false;
                const isLocked = eventType.locked;
                const Icon = channel.icon;

                return (
                  <button
                    key={channel.key}
                    onClick={() => handleToggle(eventType.key, channel.key)}
                    disabled={isLocked}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      isEnabled
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                        : 'bg-slate-800/50 text-slate-500 border-white/5 hover:border-white/10'
                    } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {updateMutation.isSuccess && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/20 text-emerald-300 text-sm">
          Preferences saved successfully.
        </div>
      )}
    </div>
  );
};

export default Settings;
