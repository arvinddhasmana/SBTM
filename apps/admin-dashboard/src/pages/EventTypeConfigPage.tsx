import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { EventTypeConfig } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/common';

export const EventTypeConfigPage: React.FC = () => {
  const { t } = useTranslation(['alertConfig']);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EventTypeConfig>>({
    eventType: '',
    tier: 'TIER_2',
    description: '',
    severity: 'MEDIUM',
    requiresLocation: false,
    isActive: true,
  });

  // Fetch all event type configs
  const { data: configs, isLoading } = useQuery({
    queryKey: ['alertConfig', 'eventTypes'],
    queryFn: () => alertConfigApi.getAllEventTypeConfigs(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<EventTypeConfig>) => alertConfigApi.createEventTypeConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'eventTypes'] });
      setIsAdding(false);
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ eventType, data }: { eventType: string; data: Partial<EventTypeConfig> }) =>
      alertConfigApi.updateEventTypeConfig(eventType, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'eventTypes'] });
      setEditingId(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (eventType: string) => alertConfigApi.deleteEventTypeConfig(eventType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'eventTypes'] });
    },
  });

  const resetForm = () => {
    setFormData({
      eventType: '',
      tier: 'TIER_2',
      description: '',
      severity: 'MEDIUM',
      requiresLocation: false,
      isActive: true,
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ eventType: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (config: EventTypeConfig) => {
    setEditingId(config.eventType);
    setFormData(config);
    setIsAdding(false);
  };

  const handleDelete = (eventType: string) => {
    if (confirm(t('alertConfig:eventTypes.deleteConfirm', { eventType }))) {
      deleteMutation.mutate(eventType);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-white">{t('alertConfig:eventTypes.loading')}</div>
      </div>
    );
  }

  return (
    <>
      <Header
        title={t('alertConfig:eventTypes.title')}
        subtitle={t('alertConfig:eventTypes.subtitle')}
      />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          {isSuperAdmin && !isAdding && !editingId && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              {t('alertConfig:eventTypes.addButton')}
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && isSuperAdmin && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId
                ? t('alertConfig:eventTypes.form.editTitle')
                : t('alertConfig:eventTypes.form.addTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:eventTypes.form.eventType')}
                </label>
                <input
                  type="text"
                  value={formData.eventType}
                  onChange={(e) =>
                    setFormData({ ...formData, eventType: e.target.value.toUpperCase() })
                  }
                  disabled={!!editingId}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                  placeholder="PANIC_BUTTON"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:eventTypes.form.tier')}
                </label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="TIER_1">{t('alertConfig:eventTypes.form.tiers.TIER_1')}</option>
                  <option value="TIER_2">{t('alertConfig:eventTypes.form.tiers.TIER_2')}</option>
                  <option value="TIER_3">{t('alertConfig:eventTypes.form.tiers.TIER_3')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:eventTypes.form.severity')}
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="CRITICAL">
                    {t('alertConfig:eventTypes.form.severities.CRITICAL')}
                  </option>
                  <option value="HIGH">{t('alertConfig:eventTypes.form.severities.HIGH')}</option>
                  <option value="MEDIUM">
                    {t('alertConfig:eventTypes.form.severities.MEDIUM')}
                  </option>
                  <option value="LOW">{t('alertConfig:eventTypes.form.severities.LOW')}</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.requiresLocation || false}
                    onChange={(e) =>
                      setFormData({ ...formData, requiresLocation: e.target.checked })
                    }
                    className="w-5 h-5"
                  />
                  {t('alertConfig:eventTypes.form.requiresLocation')}
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5"
                  />
                  {t('alertConfig:eventTypes.form.activeLabel')}
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:eventTypes.form.description')}
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  rows={3}
                  placeholder="Optional description of this event type"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={!formData.eventType || !formData.tier}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save size={18} />
                {t('alertConfig:eventTypes.form.save')}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <X size={18} />
                {t('alertConfig:eventTypes.form.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('alertConfig:eventTypes.table.eventType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('alertConfig:eventTypes.table.tier')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('alertConfig:eventTypes.table.severity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('alertConfig:eventTypes.table.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('alertConfig:eventTypes.table.status')}
                </th>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {t('alertConfig:eventTypes.table.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {configs && configs.length > 0 ? (
                configs.map((config) => (
                  <tr key={config.eventType} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {config.eventType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          config.tier === 'TIER_1'
                            ? 'bg-red-900/50 text-red-300'
                            : config.tier === 'TIER_2'
                              ? 'bg-yellow-900/50 text-yellow-300'
                              : 'bg-blue-900/50 text-blue-300'
                        }`}
                      >
                        {config.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {config.severity || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-md truncate">
                      {config.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          config.isActive !== false
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-gray-900/50 text-gray-400'
                        }`}
                      >
                        {config.isActive !== false
                          ? t('alertConfig:eventTypes.table.active')
                          : t('alertConfig:eventTypes.table.inactive')}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(config)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(config.eventType)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 6 : 5}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    {isSuperAdmin
                      ? t('alertConfig:eventTypes.emptyAdmin')
                      : t('alertConfig:eventTypes.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isSuperAdmin && (
          <div className="mt-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">{t('alertConfig:eventTypes.readOnly')}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default EventTypeConfigPage;
