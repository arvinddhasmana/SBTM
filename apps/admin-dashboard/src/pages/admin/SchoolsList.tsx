import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { organizationApi } from '../../services/api/organization.api';
import { queryKeys } from '../../services/query-keys';
import type { School, Board } from '../../services/api/organization.api';

interface SchoolFormState {
  name: string;
  boardId: string;
}

export const SchoolsList: React.FC = () => {
  const { t } = useTranslation(['schools']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [form, setForm] = useState<SchoolFormState>({ name: '', boardId: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isOstaAdmin = user?.role === 'OSTA_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isBoardAdmin = user?.role === 'BOARD_ADMIN';
  const canManage = isOstaAdmin || isBoardAdmin;

  const schoolsQueryKey = queryKeys.schools.byBoard(
    isBoardAdmin && user?.boardId ? user.boardId : undefined,
  );

  const { data, isLoading } = useQuery({
    queryKey: [...schoolsQueryKey, 'with-boards'],
    queryFn: async () => {
      const boardId = isBoardAdmin && user?.boardId ? user.boardId : undefined;
      const [schoolsData, boardsData] = await Promise.all([
        organizationApi.listSchools(boardId),
        organizationApi.listBoards(),
      ]);
      return { schools: schoolsData, boards: boardsData };
    },
  });

  const schools = data?.schools ?? [];
  const boards = data?.boards ?? [];

  const openCreateForm = () => {
    setEditingSchool(null);
    setForm({ name: '', boardId: user?.boardId ?? boards[0]?.id ?? '' });
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (school: School) => {
    setEditingSchool(school);
    setForm({ name: school.name, boardId: school.boardId });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSchool(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError(t('schools:schoolNameMinLength'));
      return;
    }
    if (!form.boardId) {
      setFormError(t('schools:selectBoardRequired'));
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingSchool) {
        await organizationApi.updateSchool(editingSchool.id, {
          name: form.name.trim(),
          boardId: form.boardId,
        });
      } else {
        await organizationApi.createSchool({ name: form.name.trim(), boardId: form.boardId });
      }
      closeForm();
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.all });
    } catch {
      setFormError(t('schools:errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (school: School) => {
    if (!isOstaAdmin) return;
    if (!window.confirm(t('schools:deleteConfirm', { name: school.name }))) return;
    try {
      await organizationApi.deleteSchool(school.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.all });
    } catch {
      setError(t('schools:errors.deleteFailed'));
    }
  };

  const boardNames = Object.fromEntries(boards.map((b) => [b.id, b.name]));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{t('schools:title')}</h1>
        {canManage && (
          <button
            onClick={openCreateForm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('schools:addSchool')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-5 bg-dashboard-card rounded-xl border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingSchool ? t('schools:editSchool') : t('schools:createSchool')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-white/60 mb-1">{t('schools:schoolName')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder={t('schools:schoolNamePlaceholder')}
                maxLength={120}
              />
            </div>
            {isOstaAdmin && (
              <div>
                <label className="block text-xs text-white/60 mb-1">
                  {t('schools:boardLabel')}
                </label>
                <select
                  value={form.boardId}
                  onChange={(e) => setForm((f) => ({ ...f, boardId: e.target.value }))}
                  className="w-full bg-dashboard-bg border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">{t('schools:selectBoard')}</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {formError && <p className="text-red-400 text-xs mt-2">{formError}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isSaving ? t('schools:actions.saving') : t('schools:actions.save')}
            </button>
            <button
              onClick={closeForm}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {t('schools:actions.cancel')}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-white/60">{t('schools:loading')}</div>
      ) : (
        <div className="bg-dashboard-card rounded-xl overflow-hidden shadow-glass border border-white/10">
          <table className="w-full text-left text-white">
            <thead className="bg-white/5 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">{t('schools:columns.name')}</th>
                <th className="px-6 py-4">{t('schools:columns.boardId')}</th>
                {canManage && <th className="px-6 py-4">{t('schools:columns.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">{school.name}</td>
                  <td className="px-6 py-4">{boardNames[school.boardId] || school.boardId}</td>
                  {canManage && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditForm(school)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          {t('schools:actions.edit')}
                        </button>
                        {isOstaAdmin && (
                          <button
                            onClick={() => handleDelete(school)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            {t('schools:actions.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {schools.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 3 : 2} className="px-6 py-8 text-center text-white/50">
                    {t('schools:empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
