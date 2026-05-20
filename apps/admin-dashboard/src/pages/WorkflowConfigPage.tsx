import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GitBranch, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { WorkflowConfig } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/common';

export const WorkflowConfigPage: React.FC = () => {
  const { t } = useTranslation(['alertConfig']);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<WorkflowConfig>>({
    actionName: 'CONFIRM',
    allowedForTier: 'TIER_1',
    allowedForStatus: 'PENDING',
    requiredRole: 'SCHOOL_ADMIN',
    requiresNotes: false,
    statusTransition: '',
    isActive: true,
  });

  // Fetch workflow configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ['alertConfig', 'workflowConfigs'],
    queryFn: () => alertConfigApi.getAllWorkflowConfigs(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<WorkflowConfig>) => alertConfigApi.createWorkflowConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'workflowConfigs'] });
      setIsAdding(false);
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkflowConfig> }) =>
      alertConfigApi.updateWorkflowConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'workflowConfigs'] });
      setEditingId(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertConfigApi.deleteWorkflowConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfig', 'workflowConfigs'] });
    },
  });

  const resetForm = () => {
    setFormData({
      actionName: 'CONFIRM',
      allowedForTier: 'TIER_1',
      allowedForStatus: 'PENDING',
      requiredRole: 'SCHOOL_ADMIN',
      requiresNotes: false,
      statusTransition: '',
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

  const handleEdit = (config: WorkflowConfig) => {
    setEditingId(config.id!);
    setFormData(config);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('alertConfig:workflow.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  return (
    <>
      <Header
        title={t('alertConfig:workflow.title')}
        subtitle={
          isSuperAdmin
            ? t('alertConfig:workflow.subtitle.admin')
            : t('alertConfig:workflow.subtitle.readOnly')
        }
      />
      <div className="p-6">
        <div className="flex justify-end mb-6">
          {isSuperAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              disabled={isAdding || editingId !== null}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} />
              {t('alertConfig:workflow.addButton')}
            </button>
          )}
        </div>

        {!isSuperAdmin && (
          <div className="mb-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <GitBranch className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold">
                  {t('alertConfig:workflow.readOnly.title')}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {t('alertConfig:workflow.readOnly.description')}
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
                ? t('alertConfig:workflow.form.editTitle')
                : t('alertConfig:workflow.form.addTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:workflow.form.actionName')}
                </label>
                <select
                  value={formData.actionName}
                  onChange={(e) => setFormData({ ...formData, actionName: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="CONFIRM">CONFIRM</option>
                  <option value="FALSE_ALARM">FALSE_ALARM</option>
                  <option value="REQUEST_INFO">REQUEST_INFO</option>
                  <option value="RESOLVE">RESOLVE</option>
                  <option value="STATUS_UPDATE">STATUS_UPDATE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:workflow.form.allowedTier')}
                </label>
                <select
                  value={formData.allowedForTier}
                  onChange={(e) => setFormData({ ...formData, allowedForTier: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="TIER_1">{t('alertConfig:workflow.form.tiers.TIER_1')}</option>
                  <option value="TIER_2">{t('alertConfig:workflow.form.tiers.TIER_2')}</option>
                  <option value="TIER_3">{t('alertConfig:workflow.form.tiers.TIER_3')}</option>
                  <option value="ALL">{t('alertConfig:workflow.form.tiers.ALL')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:workflow.form.allowedStatus')}
                </label>
                <select
                  value={formData.allowedForStatus}
                  onChange={(e) => setFormData({ ...formData, allowedForStatus: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="PENDING">{t('alertConfig:workflow.form.statuses.PENDING')}</option>
                  <option value="CONFIRMED">
                    {t('alertConfig:workflow.form.statuses.CONFIRMED')}
                  </option>
                  <option value="ESCALATED_TO_BOARD">
                    {t('alertConfig:workflow.form.statuses.ESCALATED_TO_BOARD')}
                  </option>
                  <option value="ESCALATED_TO_STA">
                    {t('alertConfig:workflow.form.statuses.ESCALATED_TO_STA')}
                  </option>
                  <option value="RESOLVED">
                    {t('alertConfig:workflow.form.statuses.RESOLVED')}
                  </option>
                  <option value="FALSE_ALARM">
                    {t('alertConfig:workflow.form.statuses.FALSE_ALARM')}
                  </option>
                  <option value="ALL">{t('alertConfig:workflow.form.statuses.ALL')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:workflow.form.requiredRole')}
                </label>
                <select
                  value={formData.requiredRole}
                  onChange={(e) => setFormData({ ...formData, requiredRole: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="SCHOOL_ADMIN">
                    {t('alertConfig:workflow.form.roles.SCHOOL_ADMIN')}
                  </option>
                  <option value="BOARD_ADMIN">
                    {t('alertConfig:workflow.form.roles.BOARD_ADMIN')}
                  </option>
                  <option value="STA_ADMIN">
                    {t('alertConfig:workflow.form.roles.STA_ADMIN')}
                  </option>
                  <option value="SUPER_ADMIN">
                    {t('alertConfig:workflow.form.roles.SUPER_ADMIN')}
                  </option>
                  <option value="ANY_ADMIN">
                    {t('alertConfig:workflow.form.roles.ANY_ADMIN')}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('alertConfig:workflow.form.statusTransition')}
                </label>
                <input
                  type="text"
                  value={formData.statusTransition || ''}
                  onChange={(e) => setFormData({ ...formData, statusTransition: e.target.value })}
                  placeholder={t('alertConfig:workflow.form.statusTransitionPlaceholder')}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresNotes || false}
                  onChange={(e) => setFormData({ ...formData, requiresNotes: e.target.checked })}
                  className="w-5 h-5"
                />
                {t('alertConfig:workflow.form.requiresNotes')}
              </label>
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5"
                />
                {t('alertConfig:workflow.form.activeLabel')}
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <Save size={20} />
                {editingId
                  ? t('alertConfig:workflow.form.saveUpdate')
                  : t('alertConfig:workflow.form.saveCreate')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <X size={20} />
                {t('alertConfig:workflow.form.cancel')}
              </button>
            </div>
          </form>
        )}

        {/* Configurations List */}
        {isLoading ? (
          <div className="text-white">{t('alertConfig:workflow.loading')}</div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:workflow.table.actionName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:workflow.table.allowedTier')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:workflow.table.allowedStatus')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:workflow.table.requiredRole')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:workflow.table.transition')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      {t('alertConfig:workflow.table.flags')}
                    </th>
                    {isSuperAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        {t('alertConfig:workflow.table.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {configs && configs.length > 0 ? (
                    configs.map((config) => (
                      <tr key={config.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                          {config.actionName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {config.allowedForTier}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {config.allowedForStatus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {config.requiredRole?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {config.statusTransition || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            {config.requiresNotes && (
                              <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                                {t('alertConfig:workflow.table.needsNotes')}
                              </span>
                            )}
                            {config.isActive === false && (
                              <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                                {t('alertConfig:workflow.table.inactive')}
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
                        {t('alertConfig:workflow.empty')}
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
            {t('alertConfig:workflow.count', { count: configs.length })}
          </div>
        )}
      </div>
    </>
  );
};

export default WorkflowConfigPage;
