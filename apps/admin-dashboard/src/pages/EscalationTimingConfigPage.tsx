import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Edit2, Save, X } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { EscalationConfig } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/common';

const msToSeconds = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '';
  return String(ms / 1000);
};

const secondsToMs = (seconds: string): number | undefined => {
  const num = parseFloat(seconds);
  return isNaN(num) ? undefined : num * 1000;
};

export const EscalationTimingConfigPage: React.FC = () => {
  const { t } = useTranslation(['alertConfig']);
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
        <div className="text-white">{t('alertConfig:escalationTiming.loading')}</div>
      </div>
    );
  }

  return (
    <>
      <Header
        title={t('alertConfig:escalationTiming.title')}
        subtitle={t('alertConfig:escalationTiming.subtitle')}
      />
      <div className="p-6">
        {/* Info Card */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
          <h3 className="text-blue-400 font-semibold mb-2">
            {t('alertConfig:escalationTiming.guidelines.title')}
          </h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• {t('alertConfig:escalationTiming.guidelines.confirmation')}</li>
            <li>• {t('alertConfig:escalationTiming.guidelines.board')}</li>
            <li>• {t('alertConfig:escalationTiming.guidelines.osta')}</li>
            <li>• {t('alertConfig:escalationTiming.guidelines.units')}</li>
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
                          {t('alertConfig:escalationTiming.badges.default')}
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {config.tier === 'TIER_1' && t('alertConfig:escalationTiming.tiers.TIER_1')}
                      {config.tier === 'TIER_2' && t('alertConfig:escalationTiming.tiers.TIER_2')}
                      {config.tier === 'TIER_3' && t('alertConfig:escalationTiming.tiers.TIER_3')}
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
                            {t('alertConfig:escalationTiming.buttons.save')}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <X size={18} />
                            {t('alertConfig:escalationTiming.buttons.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(config)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Edit2 size={18} />
                          {t('alertConfig:escalationTiming.buttons.edit')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Confirmation Timeout */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('alertConfig:escalationTiming.fields.confirmationTimeout')}
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
                          : t('alertConfig:escalationTiming.fields.notSet')}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {config.tier === 'TIER_1'
                        ? t('alertConfig:escalationTiming.hints.confirmationTier1')
                        : t('alertConfig:escalationTiming.hints.confirmationOther')}
                    </p>
                  </div>

                  {/* Board Escalation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('alertConfig:escalationTiming.fields.boardEscalation')}
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
                          : t('alertConfig:escalationTiming.fields.notSet')}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {t('alertConfig:escalationTiming.hints.board')}
                    </p>
                  </div>

                  {/* OSTA Escalation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('alertConfig:escalationTiming.fields.ostaEscalation')}
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
                          : t('alertConfig:escalationTiming.fields.notSet')}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {t('alertConfig:escalationTiming.hints.osta')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isSuperAdmin && (
          <div className="mt-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">{t('alertConfig:escalationTiming.readOnly')}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default EscalationTimingConfigPage;
