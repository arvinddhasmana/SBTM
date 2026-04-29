import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Save, X } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { EscalationConfig } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';

const msToSeconds = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '';
  return String(ms / 1000);
};

const secondsToMs = (seconds: string): number | undefined => {
  const num = parseFloat(seconds);
  return isNaN(num) ? undefined : num * 1000;
};

export const EscalationTimingConfigPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();

  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EscalationConfig>>({});

  // Fetch all escalation configs
  const { data: configs, isLoading } = useQuery({
    queryKey: ['alertConfig', 'escalationConfigs'],
    queryFn: () => alertConfigApi.getAllEscalationConfigs(),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ tier, data }: { tier: string; data: Partial<EscalationConfig> }) =>
      alertConfigApi.updateEscalationConfig(tier, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'escalationConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'cacheStatus'] });
      setEditingTier(null);
    },
  });

  const handleEdit = (config: EscalationConfig) => {
    setEditingTier(config.tier);
    setFormData(config);
  };

  const handleSave = () => {
    if (editingTier) {
      updateMutation.mutate({ tier: editingTier, data: formData });
    }
  };

  const handleCancel = () => {
    setEditingTier(null);
    setFormData({});
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-white">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Escalation Timing Configuration</h1>
        <p className="text-gray-400">
          Configure confirmation timeouts and escalation delays for each alert tier
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
        <h3 className="text-blue-400 font-semibold mb-2">Timing Guidelines</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Confirmation Timeout: Time before auto-escalating to parents (TIER 1 only)</li>
          <li>• Board Escalation: Time before escalating to Board Admin</li>
          <li>• OSTA Escalation: Time before escalating to OSTA Admin</li>
          <li>• All times are in seconds. Leave empty to disable that escalation step.</li>
        </ul>
      </div>

      {/* Configurations List */}
      <div className="space-y-4">
        {configs?.map((config) => {
          const isEditing = editingTier === config.tier;
          const currentData = isEditing ? formData : config;

          return (
            <div key={config.tier} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {config.tier}
                    {config.isDefault && (
                      <span className="ml-2 text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {config.tier === 'TIER_1' &&
                      'Safety-critical events requiring immediate attention'}
                    {config.tier === 'TIER_2' && 'Operational events for admin review'}
                    {config.tier === 'TIER_3' && 'Informational events with parent notification'}
                  </p>
                </div>
                {isSuperAdmin && (
                  <div>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Save size={18} />
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <X size={18} />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(config)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Edit2 size={18} />
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Confirmation Timeout */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmation Timeout (seconds)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={msToSeconds(formData.confirmationTimeoutMs)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmationTimeoutMs: secondsToMs(e.target.value),
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      placeholder="120"
                      min="0"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {currentData.confirmationTimeoutMs
                        ? `${currentData.confirmationTimeoutMs / 1000}s`
                        : 'Not set'}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {config.tier === 'TIER_1'
                      ? 'Time before parents are notified'
                      : 'Not applicable for this tier'}
                  </p>
                </div>

                {/* Board Escalation */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Board Escalation (seconds)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={msToSeconds(formData.boardEscalationMs)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          boardEscalationMs: secondsToMs(e.target.value),
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      placeholder="300"
                      min="0"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {currentData.boardEscalationMs
                        ? `${currentData.boardEscalationMs / 1000}s`
                        : 'Not set'}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Time before escalating to Board Admin
                  </p>
                </div>

                {/* OSTA Escalation */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    OSTA Escalation (seconds)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={msToSeconds(formData.ostaEscalationMs)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ostaEscalationMs: secondsToMs(e.target.value),
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      placeholder="900"
                      min="0"
                    />
                  ) : (
                    <div className="text-white text-lg font-semibold">
                      {currentData.ostaEscalationMs
                        ? `${currentData.ostaEscalationMs / 1000}s`
                        : 'Not set'}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Time before escalating to OSTA Admin</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isSuperAdmin && (
        <div className="mt-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            You have read-only access. Contact a Super Admin to request configuration changes.
          </p>
        </div>
      )}
    </div>
  );
};

export default EscalationTimingConfigPage;
