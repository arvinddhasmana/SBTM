import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { provisioningApi } from '../../services/api/provisioning.api';
import { organizationApi } from '../../services/api/organization.api';
import type { ProvisionedUser, InviteUserPayload, InvitableRole } from '../../services/api/provisioning.api';
import type { School } from '../../services/api/organization.api';

const INVITABLE_ROLES: { value: InvitableRole; label: string }[] = [
    { value: 'BOARD_ADMIN', label: 'Board Admin' },
    { value: 'SCHOOL_ADMIN', label: 'School Admin' },
    { value: 'DRIVER', label: 'Driver' },
    { value: 'PARENT', label: 'Parent' },
];

const ROLE_LABELS: Record<string, string> = {
    OSTA_ADMIN: 'OSTA Admin',
    BOARD_ADMIN: 'Board Admin',
    SCHOOL_ADMIN: 'School Admin',
    DRIVER: 'Driver',
    PARENT: 'Parent',
};

type InviteFormState = {
    email: string;
    role: InvitableRole;
    schoolId: string;
    boardId: string;
};

export const UserManagement: React.FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<ProvisionedUser[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [usersData, schoolsData] = await Promise.all([
                provisioningApi.listUsers(),
                user?.role === 'OSTA_ADMIN' || user?.role === 'BOARD_ADMIN'
                    ? organizationApi.listSchools(user?.boardId)
                    : Promise.resolve([]),
            ]);
            setUsers(usersData);
            setSchools(schoolsData);
        } catch {
            setError('Failed to load users.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInvite = async () => {
        if (!form.email.trim()) {
            setFormError('Email address is required.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
            setFormError('Please enter a valid email address.');
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
            setForm({ email: '', role: 'PARENT', schoolId: user?.schoolId ?? '', boardId: user?.boardId ?? '' });
            await fetchData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to send invitation.';
            setFormError(message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleToggleStatus = async (target: ProvisionedUser) => {
        const action = target.isActive ? 'deactivate' : 'reactivate';
        const label = target.isActive ? 'deactivate' : 'reactivate';
        if (!window.confirm(`Are you sure you want to ${label} this user?`)) return;
        try {
            if (target.isActive) {
                await provisioningApi.deactivateUser(target.id);
            } else {
                await provisioningApi.reactivateUser(target.id);
            }
            setSuccessMessage(`User ${action}d successfully.`);
            await fetchData();
        } catch {
            setError(`Failed to ${action} user.`);
        }
    };

    const showSchoolSelector = ['SCHOOL_ADMIN', 'DRIVER', 'PARENT'].includes(form.role);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">User Management</h1>
                <button
                    onClick={() => { setShowInviteForm(true); setSuccessMessage(null); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    + Invite User
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
                    <h2 className="text-lg font-semibold text-white mb-4">Invite New User</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs text-white/60 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                placeholder="user@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-white/60 mb-1">Role</label>
                            <select
                                value={form.role}
                                onChange={(e) => setForm(f => ({ ...f, role: e.target.value as InvitableRole }))}
                                className="w-full bg-dashboard-bg border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                {INVITABLE_ROLES
                                    .filter(r => {
                                        if (user?.role === 'SCHOOL_ADMIN') return r.value === 'DRIVER' || r.value === 'PARENT';
                                        return true;
                                    })
                                    .map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))
                                }
                            </select>
                        </div>
                        {showSchoolSelector && schools.length > 0 && (
                            <div>
                                <label className="block text-xs text-white/60 mb-1">School</label>
                                <select
                                    value={form.schoolId}
                                    onChange={(e) => setForm(f => ({ ...f, schoolId: e.target.value }))}
                                    className="w-full bg-dashboard-bg border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select a school…</option>
                                    {schools.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
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
                            {isInviting ? 'Sending…' : 'Send Invitation'}
                        </button>
                        <button
                            onClick={() => setShowInviteForm(false)}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-white/60">Loading…</div>
            ) : (
                <div className="bg-dashboard-card rounded-xl overflow-hidden shadow-glass border border-white/10">
                    <table className="w-full text-left text-white">
                        <thead className="bg-white/5 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-sm">{u.email}</td>
                                    <td className="px-6 py-4 text-sm text-white/80">
                                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded">
                                            {ROLE_LABELS[u.role] ?? u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs px-2 py-1 rounded ${u.isActive ? 'bg-green-900/40 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.id !== user?.id && (
                                            <button
                                                onClick={() => handleToggleStatus(u)}
                                                className={`text-sm ${u.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                                            >
                                                {u.isActive ? 'Deactivate' : 'Reactivate'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-white/50">
                                        No users found.
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
