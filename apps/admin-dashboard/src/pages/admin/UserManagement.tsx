import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { provisioningApi } from '../../services/api/provisioning.api';
import { organizationApi } from '../../services/api/organization.api';
import { queryKeys } from '../../services/query-keys';
import type {
  ProvisionedUser,
  InviteUserPayload,
  InvitableRole,
} from '../../services/api/provisioning.api';
import type { School } from '../../services/api/organization.api';

const INVITABLE_ROLES: InvitableRole[] = [
  'OSTA_ADMIN',
  'BOARD_ADMIN',
  'SCHOOL_ADMIN',
  'DRIVER',
  'PARENT',
];

type InviteFormState = {
  email: string;
  role: InvitableRole;
  schoolId: string;
  boardId: string;
};

export const UserManagement: React.FC = () => {
  const { t } = useTranslation(['users']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [form, setForm] = useState<InviteFormState>({
    email: '',
    role: 'PARENT',
    schoolId: user?.schoolId ?? '',
    boardId: user?.boardId ?? '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const userManagementQueryKey = [...queryKeys.users.all, 'with-schools'];

  const { data, isLoading } = useQuery({
    queryKey: userManagementQueryKey,
    queryFn: async () => {
      const [usersData, schoolsData] = await Promise.all([
        provisioningApi.listUsers(),
        user?.role === 'SUPER_ADMIN' || user?.role === 'OSTA_ADMIN' || user?.role === 'BOARD_ADMIN'
          ? organizationApi.listSchools(user?.boardId)
          : Promise.resolve([]),
      ]);
      return { users: usersData, schools: schoolsData };
    },
  });

  const users = data?.users ?? [];
  const schools = data?.schools ?? [];

  const handleInvite = async () => {
    if (!form.email.trim()) {
      setFormError(t('users:errors.emailRequired'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setFormError(t('users:errors.emailInvalid'));
      return;
    }

    setIsInviting(true);
    setFormError(null);
    try {
      const payload: InviteUserPayload = { email: form.email.trim(), role: form.role };
      if (form.schoolId) payload.schoolId = form.schoolId;
      if (form.role === 'BOARD_ADMIN' && form.boardId) payload.boardId = form.boardId;

      const result = await provisioningApi.inviteUser(payload);
      setSuccessMessage(`${result.message}. Token URL: ${result.invitationUrl}`);
      setShowInviteForm(false);
      setForm({
        email: '',
        role: 'PARENT',
        schoolId: user?.schoolId ?? '',
        boardId: user?.boardId ?? '',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('users:errors.inviteFailed');
      setFormError(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleStatus = async (target: ProvisionedUser) => {
    const verbKey = target.isActive
      ? 'users:actions.deactivateVerb'
      : 'users:actions.reactivateVerb';
    if (!window.confirm(t('users:confirmToggle', { action: t(verbKey) }))) return;
    try {
      if (target.isActive) {
        await provisioningApi.deactivateUser(target.id);
        setSuccessMessage(t('users:successDeactivated'));
      } else {
        await provisioningApi.reactivateUser(target.id);
        setSuccessMessage(t('users:successReactivated'));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch {
      const action = target.isActive ? 'deactivate' : 'reactivate';
      setError(t('users:errors.toggleFailed', { action }));
    }
  };

  const showSchoolSelector = ['SCHOOL_ADMIN', 'DRIVER', 'PARENT'].includes(form.role);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{t('users:title')}</h1>
        <button
          onClick={() => {
            setShowInviteForm(true);
            setSuccessMessage(null);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {t('users:inviteUser')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-900/40 border border-green-500/50 rounded-lg text-green-300 text-sm">
          {successMessage}
        </div>
      )}

      {showInviteForm && (
        <div className="mb-6 p-5 bg-dashboard-card rounded-xl border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">{t('users:inviteNewUser')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-white/60 mb-1">{t('users:emailAddress')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder={t('users:emailPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">{t('users:roleLabel')}</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as InvitableRole }))}
                className="w-full bg-dashboard-bg border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {INVITABLE_ROLES.filter((r) => {
                  if (user?.role === 'SCHOOL_ADMIN') return r === 'DRIVER' || r === 'PARENT';
                  if (user?.role === 'BOARD_ADMIN')
                    return r !== 'OSTA_ADMIN' && r !== 'BOARD_ADMIN';
                  if (user?.role === 'OSTA_ADMIN') return r !== 'OSTA_ADMIN';
                  return true;
                }).map((r) => (
                  <option key={r} value={r}>
                    {t(`users:roles.${r}`, { defaultValue: r })}
                  </option>
                ))}
              </select>
            </div>
            {showSchoolSelector && schools.length > 0 && (
              <div>
                <label className="block text-xs text-white/60 mb-1">{t('users:schoolLabel')}</label>
                <select
                  value={form.schoolId}
                  onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}
                  className="w-full bg-dashboard-bg border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">{t('users:selectSchool')}</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {formError && <p className="text-red-400 text-xs mt-2">{formError}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleInvite}
              disabled={isInviting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isInviting ? t('users:actions.sending') : t('users:actions.sendInvitation')}
            </button>
            <button
              onClick={() => setShowInviteForm(false)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {t('users:actions.cancel')}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-white/60">{t('users:loading')}</div>
      ) : (
        <div className="bg-dashboard-card rounded-xl overflow-hidden shadow-glass border border-white/10">
          <table className="w-full text-left text-white">
            <thead className="bg-white/5 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">{t('users:columns.email')}</th>
                <th className="px-6 py-4">{t('users:columns.name')}</th>
                <th className="px-6 py-4">{t('users:columns.role')}</th>
                <th className="px-6 py-4">{t('users:columns.status')}</th>
                <th className="px-6 py-4">{t('users:columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-white/80">
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded">
                      {t(`users:roles.${u.role}`, { defaultValue: u.role })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${u.isActive ? 'bg-green-900/40 text-green-300' : 'bg-gray-700 text-gray-400'}`}
                    >
                      {u.isActive ? t('users:status.active') : t('users:status.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`text-sm ${u.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                      >
                        {u.isActive ? t('users:actions.deactivate') : t('users:actions.reactivate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/50">
                    {t('users:empty')}
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
