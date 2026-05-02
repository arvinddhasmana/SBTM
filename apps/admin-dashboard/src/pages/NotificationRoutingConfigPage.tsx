import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { NotificationRoutingConfig } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/common';

export const NotificationRoutingConfigPage: React.FC = () => {
  const { t } = useTranslation(['alertConfig']);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<NotificationRoutingConfig>>({
    tier: 'TIER_1',
    recipientRole: 'SCHOOL_ADMIN',
    notificationTiming: 'IMMEDIATE',
    channels: ['WEBSOCKET'],
    isMandatory: false,
    isActive: true,
  });

  // Fetch notification routing configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ['alertConfig', 'notificationRouting'],
    queryFn: () => alertConfigApi.getAllNotificationRoutingConfigs(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<NotificationRoutingConfig>) =>
      alertConfigApi.createNotificationRoutingConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'notificationRouting'] });
      setIsAdding(false);
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NotificationRoutingConfig> }) =>
      alertConfigApi.updateNotificationRoutingConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'notificationRouting'] });
      setEditingId(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertConfigApi.deleteNotificationRoutingConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'notificationRouting'] });
    },
  });

  const resetForm = () => {
    setFormData({
      tier: 'TIER_1',
      recipientRole: 'SCHOOL_ADMIN',
      notificationTiming: 'IMMEDIATE',
      channels: ['WEBSOCKET'],
      isMandatory: false,
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (config: NotificationRoutingConfig) => {
    setEditingId(config.id!);
    setFormData(config);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this notification routing configuration?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleChannelToggle = (channel: string) => {
    const currentChannels = formData.channels || [];
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter((c) => c !== channel)
      : [...currentChannels, channel];
    setFormData({ ...formData, channels: newChannels });
  };

  return (
    <>
      <Header
        title={t('alertConfig:notificationRouting.title')}
        subtitle={
          isSuperAdmin
            ? t('alertConfig:notificationRouting.subtitle.admin')
            : t('alertConfig:notificationRouting.subtitle.readOnly')
        }
      />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          {isSuperAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              disabled={isAdding || editingId !== null}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} />
              {t('alertConfig:notificationRouting.addButton')}
            </button>
          )}
        </div>

        {!isSuperAdmin && (
          <div className="mb-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold">
                  {t('alertConfig:notificationRouting.readOnly.title')}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {t('alertConfig:notificationRouting.readOnly.description')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {(isAdding || editingId) && isSuperAdmin && (
          <form
            onSubmit={handleSubmit}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingId
                ? t('alertConfig:notificationRouting.form.editTitle')
                : t('alertConfig:notificationRouting.form.addTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:notificationRouting.form.tier')}
                </label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="TIER_1">
                    {t('alertConfig:notificationRouting.form.tiers.TIER_1')}
                  </option>
                  <option value="TIER_2">
                    {t('alertConfig:notificationRouting.form.tiers.TIER_2')}
                  </option>
                  <option value="TIER_3">
                    {t('alertConfig:notificationRouting.form.tiers.TIER_3')}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:notificationRouting.form.eventType')}
                </label>
                <input
                  type="text"
                  value={formData.eventType || ''}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  placeholder={t('alertConfig:notificationRouting.form.eventTypePlaceholder')}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:notificationRouting.form.recipientRole')}
                </label>
                <select
                  value={formData.recipientRole}
                  onChange={(e) => setFormData({ ...formData, recipientRole: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="SCHOOL_ADMIN">
                    {t('alertConfig:notificationRouting.form.roles.SCHOOL_ADMIN')}
                  </option>
                  <option value="BOARD_ADMIN">
                    {t('alertConfig:notificationRouting.form.roles.BOARD_ADMIN')}
                  </option>
                  <option value="OSTA_ADMIN">
                    {t('alertConfig:notificationRouting.form.roles.OSTA_ADMIN')}
                  </option>
                  <option value="PARENT">
                    {t('alertConfig:notificationRouting.form.roles.PARENT')}
                  </option>
                  <option value="DRIVER">
                    {t('alertConfig:notificationRouting.form.roles.DRIVER')}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:notificationRouting.form.notificationTiming')}
                </label>
                <select
                  value={formData.notificationTiming}
                  onChange={(e) => setFormData({ ...formData, notificationTiming: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="IMMEDIATE">
                    {t('alertConfig:notificationRouting.form.timings.IMMEDIATE')}
                  </option>
                  <option value="AFTER_CONFIRMATION">
                    {t('alertConfig:notificationRouting.form.timings.AFTER_CONFIRMATION')}
                  </option>
                  <option value="ON_TIMEOUT">
                    {t('alertConfig:notificationRouting.form.timings.ON_TIMEOUT')}
                  </option>
                  <option value="ON_ESCALATION">
                    {t('alertConfig:notificationRouting.form.timings.ON_ESCALATION')}
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('alertConfig:notificationRouting.form.channels')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['WEBSOCKET', 'PUSH', 'SMS', 'EMAIL'].map((channel) => (
                  <label
                    key={channel}
                    className="flex items-center gap-2 text-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.channels?.includes(channel) || false}
                      onChange={() => handleChannelToggle(channel)}
                      className="w-5 h-5"
                    />
                    {channel}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isMandatory || false}
                  onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                  className="w-5 h-5"
                />
                {t('alertConfig:notificationRouting.form.mandatoryLabel')}
              </label>
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5"
                />
                {t('alertConfig:notificationRouting.form.activeLabel')}
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <Save size={20} />
                {editingId
                  ? t('alertConfig:notificationRouting.form.saveUpdate')
                  : t('alertConfig:notificationRouting.form.saveCreate')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <X size={20} />
                {t('alertConfig:notificationRouting.form.cancel')}
              </button>
            </div>
          </form>
        )}

        {/* Configurations List */}
        {isLoading ? (
          <div className="text-white">{t('alertConfig:notificationRouting.loading')}</div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:notificationRouting.table.tier')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:notificationRouting.table.eventType')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:notificationRouting.table.recipient')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:notificationRouting.table.timing')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:notificationRouting.table.channels')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:notificationRouting.table.flags')}
                    </th>
                    {isSuperAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        {t('alertConfig:notificationRouting.table.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {configs && configs.length > 0 ? (
                    configs.map((config) => (
                      <tr key={config.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                          {config.tier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {config.eventType || t('alertConfig:notificationRouting.table.allEvents')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {config.recipientRole}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {config.notificationTiming}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {config.channels.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            {config.isMandatory && (
                              <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-xs">
                                {t('alertConfig:notificationRouting.table.mandatory')}
                              </span>
                            )}
                            {config.isActive === false && (
                              <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                                {t('alertConfig:notificationRouting.table.inactive')}
                              </span>
                            )}
                          </div>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(config)}
                                disabled={isAdding || editingId !== null}
                                className="text-blue-400 hover:text-blue-300 disabled:text-gray-600"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(config.id!)}
                                disabled={deleteMutation.isPending}
                                className="text-red-400 hover:text-red-300 disabled:text-gray-600"
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
                        colSpan={isSuperAdmin ? 7 : 6}
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        {t('alertConfig:notificationRouting.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {configs && configs.length > 0 && (
          <div className="mt-4 text-sm text-gray-400">
            {t('alertConfig:notificationRouting.count', { count: configs.length })}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationRoutingConfigPage;
