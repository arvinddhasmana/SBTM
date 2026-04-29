import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { WorkflowConfig } from '../types/alert-config';
import { useAuth } from '../context/AuthContext';

export const WorkflowConfigPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<WorkflowConfig>>({
    actionName: '',
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
      actionName: '',
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
    if (confirm('Are you sure you want to delete this workflow configuration?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Workflow Configuration</h1>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              disabled={isAdding || editingId !== null}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Add Workflow Action
            </button>
          )}
        </div>
        <p className="text-gray-400">
          {isSuperAdmin
            ? 'Configure available workflow actions and role-based permissions'
            : 'View workflow action configurations'}
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="mb-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <GitBranch className="h-5 w-5 text-yellow-400 mt-0.5" />
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
            {editingId ? 'Edit Workflow Action' : 'Add New Workflow Action'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Action Name</label>
              <input
                type="text"
                value={formData.actionName}
                onChange={(e) => setFormData({ ...formData, actionName: e.target.value })}
                placeholder="e.g., confirm, resolve, escalate"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Allowed Tier</label>
              <select
                value={formData.allowedForTier}
                onChange={(e) => setFormData({ ...formData, allowedForTier: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="TIER_1">Tier 1 (Safety-Critical)</option>
                <option value="TIER_2">Tier 2 (Operational)</option>
                <option value="TIER_3">Tier 3 (Informational)</option>
                <option value="ALL">All Tiers</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Allowed Status</label>
              <select
                value={formData.allowedForStatus}
                onChange={(e) => setFormData({ ...formData, allowedForStatus: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="ESCALATED_TO_BOARD">Escalated to Board</option>
                <option value="ESCALATED_TO_OSTA">Escalated to OSTA</option>
                <option value="RESOLVED">Resolved</option>
                <option value="FALSE_ALARM">False Alarm</option>
                <option value="ALL">All Statuses</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Required Role</label>
              <select
                value={formData.requiredRole}
                onChange={(e) => setFormData({ ...formData, requiredRole: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="SCHOOL_ADMIN">School Admin</option>
                <option value="BOARD_ADMIN">Board Admin</option>
                <option value="OSTA_ADMIN">OSTA Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ANY_ADMIN">Any Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status Transition
              </label>
              <input
                type="text"
                value={formData.statusTransition || ''}
                onChange={(e) => setFormData({ ...formData, statusTransition: e.target.value })}
                placeholder="Optional - e.g., RESOLVED"
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
              Requires Notes
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
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <Save size={20} />
              {editingId ? 'Save Changes' : 'Create Action'}
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
                    Action Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Allowed Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Allowed Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Required Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Transition
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
                        {config.actionName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {config.allowedForTier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {config.allowedForStatus}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {config.requiredRole}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {config.statusTransition || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {config.requiresNotes && (
                            <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                              Needs Notes
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
                      No workflow configurations found.
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
          Showing {configs.length} workflow {configs.length === 1 ? 'action' : 'actions'}
        </div>
      )}
    </div>
  );
};

export default WorkflowConfigPage;
