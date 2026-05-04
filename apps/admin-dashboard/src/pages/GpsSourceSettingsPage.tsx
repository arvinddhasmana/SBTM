/**
 * GpsSourceSettingsPage
 *
 * Super Admin page for managing the system-wide GPS tracking source.
 * Allows switching between DRIVER_APP and DEDICATED_GPS modes, with a
 * confirmation dialog to prevent accidental changes.
 *
 * Also provides GPS hardware device token management: create, list, and delete
 * tokens that hardware GPS units use to authenticate with the ingestion endpoint.
 *
 * Access: SUPER_ADMIN only (enforced by RoleGuard in App.tsx and by the API gateway).
 * Classification: T2 — operational configuration; no student PII displayed or stored.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Shield, Cpu, Trash2, Plus, Copy, Check, AlertTriangle } from 'lucide-react';
import { Header } from '../components/common';
import { useAuth } from '../context/AuthContext';
import {
  systemSettingsApi,
  type GpsTrackingSource,
  type GpsDeviceToken,
  type CreatedGpsDeviceToken,
} from '../services/api/system-settings.api';

// ── Types ────────────────────────────────────────────────────────────────────

interface NewTokenForm {
  vehicleId: string;
  schoolId: string;
  description: string;
}

const EMPTY_FORM: NewTokenForm = { vehicleId: '', schoolId: '', description: '' };

// ── Component ────────────────────────────────────────────────────────────────

const GpsSourceSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Pending source selection before confirmation
  const [pendingSource, setPendingSource] = useState<GpsTrackingSource | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Device token creation form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTokenForm, setNewTokenForm] = useState<NewTokenForm>(EMPTY_FORM);
  const [createdToken, setCreatedToken] = useState<CreatedGpsDeviceToken | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Restrict to Super Admin
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-6">
        <p className="text-red-400">Access denied. Super Admin role required.</p>
      </div>
    );
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: sourceData, isLoading: sourceLoading } = useQuery({
    queryKey: ['system-settings', 'gps-source'],
    queryFn: () => systemSettingsApi.getGpsSource(),
  });

  const currentSource = sourceData?.source ?? 'DRIVER_APP';

  // For the token list, Super Admin must provide a schoolId.
  // We allow filtering by the URL-provided schoolId or let admin type one.
  const [filterSchoolId, setFilterSchoolId] = useState('');

  const {
    data: tokens,
    isLoading: tokensLoading,
    refetch: refetchTokens,
  } = useQuery({
    queryKey: ['system-settings', 'device-tokens', filterSchoolId],
    queryFn: () =>
      filterSchoolId ? systemSettingsApi.listDeviceTokens(filterSchoolId) : Promise.resolve([]),
    enabled: filterSchoolId.length > 0,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const setSourceMutation = useMutation({
    mutationFn: (source: GpsTrackingSource) => systemSettingsApi.setGpsSource(source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'gps-source'] });
      setShowConfirm(false);
      setPendingSource(null);
    },
  });

  const createTokenMutation = useMutation({
    mutationFn: () =>
      systemSettingsApi.createDeviceToken({
        vehicleId: newTokenForm.vehicleId.trim(),
        schoolId: newTokenForm.schoolId.trim(),
        description: newTokenForm.description.trim() || undefined,
      }),
    onSuccess: (data) => {
      setCreatedToken(data);
      setNewTokenForm(EMPTY_FORM);
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'device-tokens'] });
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: (id: string) => systemSettingsApi.deleteDeviceToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'device-tokens'] });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSourceSelect = (source: GpsTrackingSource) => {
    if (source === currentSource) return;
    setPendingSource(source);
    setShowConfirm(true);
  };

  const handleConfirmSwitch = () => {
    if (pendingSource) {
      setSourceMutation.mutate(pendingSource);
    }
  };

  const handleCancelSwitch = () => {
    setShowConfirm(false);
    setPendingSource(null);
  };

  const handleCopyToken = async () => {
    if (createdToken?.token) {
      await navigator.clipboard.writeText(createdToken.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleDeleteToken = (token: GpsDeviceToken) => {
    if (
      window.confirm(
        `Delete device token for vehicle ${token.vehicleId}? This is immediate and irreversible.`,
      )
    ) {
      deleteTokenMutation.mutate(token.id);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="GPS Tracking Source"
        subtitle="Configure whether GPS data comes from the driver app or dedicated hardware devices"
      />

      <div className="p-6 space-y-8">
        {/* ── GPS Source Toggle ───────────────────────────────────────── */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Radio size={20} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">GPS Tracking Source</h2>
            {sourceLoading && <span className="text-sm text-gray-400">Loading…</span>}
          </div>

          {/* Current source badge */}
          <div className="mb-6">
            <span className="text-sm text-gray-400 mr-2">Current:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                currentSource === 'DRIVER_APP'
                  ? 'bg-green-900/50 text-green-300'
                  : 'bg-blue-900/50 text-blue-300'
              }`}
            >
              {currentSource === 'DRIVER_APP' ? '📱 DRIVER_APP' : '📡 DEDICATED_GPS'}
            </span>
          </div>

          {/* Source selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DRIVER_APP option */}
            <button
              onClick={() => handleSourceSelect('DRIVER_APP')}
              disabled={sourceLoading || setSourceMutation.isPending}
              className={`p-5 rounded-lg border-2 text-left transition-all ${
                currentSource === 'DRIVER_APP'
                  ? 'border-green-500 bg-green-900/20'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📱</span>
                <span className="text-white font-semibold">Driver App</span>
                {currentSource === 'DRIVER_APP' && (
                  <span className="ml-auto text-xs bg-green-700 text-green-200 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                GPS data comes from the driver's mobile app. Requires drivers to start the route on
                their phone.
              </p>
            </button>

            {/* DEDICATED_GPS option */}
            <button
              onClick={() => handleSourceSelect('DEDICATED_GPS')}
              disabled={sourceLoading || setSourceMutation.isPending}
              className={`p-5 rounded-lg border-2 text-left transition-all ${
                currentSource === 'DEDICATED_GPS'
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📡</span>
                <span className="text-white font-semibold">Dedicated GPS Hardware</span>
                {currentSource === 'DEDICATED_GPS' && (
                  <span className="ml-auto text-xs bg-blue-700 text-blue-200 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                GPS data comes from hardware devices installed on buses. Driver app submissions are
                rejected. Requires device tokens to be configured below.
              </p>
            </button>
          </div>

          {setSourceMutation.isError && (
            <p className="mt-4 text-red-400 text-sm">
              Failed to update GPS source. Please try again.
            </p>
          )}
        </div>

        {/* ── Device Token Management ─────────────────────────────────── */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Cpu size={20} className="text-purple-400" />
              <h2 className="text-lg font-semibold text-white">GPS Device Tokens</h2>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setCreatedToken(null);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
            >
              <Plus size={16} />
              Create Token
            </button>
          </div>

          {/* Created token display (shown once) */}
          {createdToken && (
            <div className="mb-6 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-300 text-sm font-semibold">
                  Token created — copy it now. It will not be shown again.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-gray-900 rounded p-3 font-mono text-sm text-green-400 break-all">
                <span className="flex-1">{createdToken.token}</span>
                <button
                  onClick={handleCopyToken}
                  className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedToken ? (
                    <Check size={16} className="text-green-400" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Vehicle: {createdToken.vehicleId} · School: {createdToken.schoolId}
                {createdToken.description && ` · ${createdToken.description}`}
              </p>
            </div>
          )}

          {/* Create token form */}
          {showCreateForm && (
            <div className="mb-6 bg-gray-700 border border-gray-600 rounded-lg p-5">
              <h3 className="text-white font-medium mb-4">New Device Token</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Vehicle ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTokenForm.vehicleId}
                    onChange={(e) =>
                      setNewTokenForm({ ...newTokenForm, vehicleId: e.target.value })
                    }
                    placeholder="e.g. BUS-042"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    School ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTokenForm.schoolId}
                    onChange={(e) => setNewTokenForm({ ...newTokenForm, schoolId: e.target.value })}
                    placeholder="School UUID"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newTokenForm.description}
                    onChange={(e) =>
                      setNewTokenForm({ ...newTokenForm, description: e.target.value })
                    }
                    placeholder="e.g. Bus 42 — front tracker unit"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => createTokenMutation.mutate()}
                  disabled={
                    !newTokenForm.vehicleId.trim() ||
                    !newTokenForm.schoolId.trim() ||
                    createTokenMutation.isPending
                  }
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  {createTokenMutation.isPending ? 'Creating…' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTokenForm(EMPTY_FORM);
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
              {createTokenMutation.isError && (
                <p className="text-red-400 text-sm mt-2">
                  Failed to create token. Please try again.
                </p>
              )}
            </div>
          )}

          {/* School ID filter for token list */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Filter by School ID
            </label>
            <input
              type="text"
              value={filterSchoolId}
              onChange={(e) => setFilterSchoolId(e.target.value)}
              placeholder="Enter school UUID to list its device tokens"
              className="w-full max-w-md bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          {/* Token list */}
          {filterSchoolId && (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Token (masked)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {tokensLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">
                        Loading…
                      </td>
                    </tr>
                  ) : tokens && tokens.length > 0 ? (
                    tokens.map((token) => (
                      <tr key={token.id} className="hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-white font-mono">
                          {token.vehicleId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {token.description ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                          {token.maskedToken}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {token.lastSeenAt ? new Date(token.lastSeenAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              token.isActive
                                ? 'bg-green-900/50 text-green-300'
                                : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            {token.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteToken(token)}
                            disabled={deleteTokenMutation.isPending}
                            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Delete token"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">
                        No device tokens found for this school.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Security note ───────────────────────────────────────────── */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-400">
              <p className="font-medium text-gray-300 mb-1">Security Notes</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Device tokens are 256-bit random values. Store them securely on the device.</li>
                <li>Tokens are shown only once at creation — they cannot be retrieved again.</li>
                <li>Delete tokens immediately if a device is decommissioned or compromised.</li>
                <li>
                  Switching GPS source affects all buses system-wide. Coordinate hardware
                  installation before switching to DEDICATED_GPS.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation modal ─────────────────────────────────────────── */}
      {showConfirm && pendingSource && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-yellow-400" />
              <h3 className="text-white text-lg font-semibold">Confirm GPS Source Change</h3>
            </div>

            <p className="text-gray-300 text-sm mb-4">
              You are switching the GPS tracking source to{' '}
              <span className="font-semibold text-white">
                {pendingSource === 'DRIVER_APP' ? '📱 DRIVER_APP' : '📡 DEDICATED_GPS'}
              </span>
              .
            </p>

            {pendingSource === 'DEDICATED_GPS' ? (
              <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-3 mb-5 text-sm text-yellow-300">
                <strong>Impact:</strong> Driver app GPS submissions will be rejected with an error.
                Ensure dedicated hardware devices are physically installed on buses and device
                tokens are configured before switching.
              </div>
            ) : (
              <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-3 mb-5 text-sm text-blue-300">
                <strong>Impact:</strong> Dedicated GPS hardware submissions will be rejected.
                Drivers must use the mobile app to report their location.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirmSwitch}
                disabled={setSourceMutation.isPending}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
              >
                {setSourceMutation.isPending ? 'Switching…' : 'Confirm Switch'}
              </button>
              <button
                onClick={handleCancelSwitch}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GpsSourceSettingsPage;
