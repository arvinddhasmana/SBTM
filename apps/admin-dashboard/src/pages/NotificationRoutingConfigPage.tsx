import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { NotificationRoutingConfig } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';

export const NotificationRoutingConfigPage: React.FC = () => {
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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">Notification Routing Configuration</h1>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              disabled={isAdding || editingId !== null}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Add Routing Rule
            </button>
          )}
        </div>
        <p className="text-gray-400">
          {isSuperAdmin
            ? 'Configure notification channels and recipients per tier and event type'
            : 'View notification routing rules'}
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="mb-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="text-yellow-400 font-semibold">Read-Only Access</h3>
              <p className="text-gray-400 text-sm mt-1">
                You have read-only access. To request changes, use the Change Requests section.
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
            {editingId ? 'Edit Routing Rule' : 'Add New Routing Rule'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="TIER_1">Tier 1 (Safety-Critical)</option>
                <option value="TIER_2">Tier 2 (Operational)</option>
                <option value="TIER_3">Tier 3 (Informational)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
              <input
                type="text"
                value={formData.eventType || ''}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                placeholder="Optional - leave empty for all"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient Role
              </label>
              <select
                value={formData.recipientRole}
                onChange={(e) => setFormData({ ...formData, recipientRole: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="SCHOOL_ADMIN">School Admin</option>
                <option value="BOARD_ADMIN">Board Admin</option>
                <option value="OSTA_ADMIN">OSTA Admin</option>
                <option value="PARENT">Parent</option>
                <option value="DRIVER">Driver</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notification Timing
              </label>
              <select
                value={formData.notificationTiming}
                onChange={(e) => setFormData({ ...formData, notificationTiming: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="AFTER_CONFIRMATION">After Confirmation</option>
                <option value="ON_TIMEOUT">On Timeout</option>
                <option value="ON_ESCALATION">On Escalation</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notification Channels
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['WEBSOCKET', 'PUSH', 'SMS', 'EMAIL'].map((channel) => (
                <label key={channel} className="flex items-center gap-2 text-white cursor-pointer">
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
              Mandatory
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5"
              />
              Active
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <Save size={20} />
              {editingId ? 'Save Changes' : 'Create Rule'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <X size={20} />
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Configurations List */}
      {isLoading ? (
        <div className="text-white">Loading configurations...</div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Timing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Channels
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Flags
                  </th>
                  {isSuperAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Actions
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
                        {config.eventType || 'All'}
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
                              Mandatory
                            </span>
                          )}
                          {config.isActive === false && (
                            <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                              Inactive
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
                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-6 py-8 text-center text-gray-400">
                      No notification routing configurations found.
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
          Showing {configs.length} routing {configs.length === 1 ? 'rule' : 'rules'}
        </div>
      )}
    </div>
  );
};

export default NotificationRoutingConfigPage;
