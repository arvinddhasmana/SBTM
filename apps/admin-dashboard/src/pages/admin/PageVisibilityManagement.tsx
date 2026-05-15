/**
 * PageVisibilityManagement
 *
 * Super Admin page for controlling which pages are visible to non-Super-Admin users.
 * Hidden pages are removed from the left navigation and blocked at the route level.
 * The Settings page and this page itself cannot be hidden.
 *
 * Access: SUPER_ADMIN only (enforced by RoleGuard in App.tsx and by the API gateway).
 * Classification: T2 — admin configuration, no student PII.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, LayoutGrid, Shield, AlertTriangle } from 'lucide-react';
import { Header } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import {
  pageVisibilityApi,
  HIDEABLE_PAGE_KEYS,
  type PageVisibilityRecord,
} from '../../services/api/page-visibility.api';

// Display labels matching the sidebar labels
const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  alerts: 'Alerts',
  'alerts/operational': 'Operational Alerts',
  routes: 'Routes',
  'routes/planner': 'Route Planner',
  vehicles: 'Fleet',
  compliance: 'Compliance',
  'fleet-assignments': 'Fleet Assignments',
  students: 'Students',
  absences: 'Absences',
  boards: 'Boards',
  schools: 'Schools',
  users: 'Users',
  'alert-config': 'Alert Config',
  'settings/gps-source': 'GPS Tracker',
  'tenant-overview': 'Tenant Overview',
  videos: 'Videos',
};

const PageVisibilityManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingToggle, setPendingToggle] = useState<{
    pageKey: string;
    isVisible: boolean;
  } | null>(null);

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-6">
        <p className="text-red-400">Access denied. Super Admin role required.</p>
      </div>
    );
  }

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['page-visibility'],
    queryFn: () => pageVisibilityApi.getAll(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      pageKey,
      isVisible,
      pageName,
    }: {
      pageKey: string;
      isVisible: boolean;
      pageName: string;
    }) =>
      pageVisibilityApi.update(pageKey as (typeof HIDEABLE_PAGE_KEYS)[number], isVisible, pageName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-visibility'] });
      setPendingToggle(null);
    },
    onError: () => {
      setPendingToggle(null);
    },
  });

  const handleToggleRequest = (record: PageVisibilityRecord) => {
    setPendingToggle({ pageKey: record.pageKey, isVisible: !record.isVisible });
  };

  const handleConfirm = () => {
    if (!pendingToggle) return;
    const pageName = PAGE_LABELS[pendingToggle.pageKey] ?? pendingToggle.pageKey;
    toggleMutation.mutate({
      pageKey: pendingToggle.pageKey,
      isVisible: pendingToggle.isVisible,
      pageName,
    });
  };

  const hiddenCount = records.filter((r) => !r.isVisible).length;

  return (
    <>
      <Header
        title="Page Visibility"
        subtitle="Control which pages are visible to non-Super-Admin users"
      />

      <div className="p-6 space-y-6">
        {/* Summary badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
            <LayoutGrid size={18} className="text-blue-400" />
            <span className="text-sm text-gray-300">
              <span className="font-semibold text-white">{records.length - hiddenCount}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span>{records.length}</span>
              <span className="ml-1">pages visible</span>
            </span>
          </div>
          {hiddenCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-600/40 rounded-lg px-4 py-3">
              <EyeOff size={16} className="text-yellow-400" />
              <span className="text-sm text-yellow-300">
                {hiddenCount} page{hiddenCount !== 1 ? 's' : ''} hidden from other users
              </span>
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 flex items-start gap-3">
          <Shield size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-1">Visibility Rules</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Super Admin always sees all pages regardless of these settings.</li>
              <li>
                Hidden pages are removed from the navigation and blocked at the route level for all
                other roles.
              </li>
              <li>Settings and this page cannot be hidden.</li>
            </ul>
          </div>
        </div>

        {/* Page list */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-base font-semibold text-white">Hideable Pages</h2>
          </div>

          {isLoading ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {records.map((record) => {
                const label = PAGE_LABELS[record.pageKey] ?? record.pageKey;
                const isMutating =
                  toggleMutation.isPending && pendingToggle?.pageKey === record.pageKey;

                return (
                  <div
                    key={record.pageKey}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {record.isVisible ? (
                        <Eye size={18} className="text-green-400 flex-shrink-0" />
                      ) : (
                        <EyeOff size={18} className="text-gray-500 flex-shrink-0" />
                      )}
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            record.isVisible ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {label}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">/{record.pageKey}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          record.isVisible
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {record.isVisible ? 'Visible' : 'Hidden'}
                      </span>

                      <button
                        onClick={() => handleToggleRequest(record)}
                        disabled={isMutating || toggleMutation.isPending}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          record.isVisible
                            ? 'bg-gray-700 hover:bg-red-900/40 hover:text-red-300 text-gray-300'
                            : 'bg-gray-700 hover:bg-green-900/40 hover:text-green-300 text-gray-300'
                        }`}
                      >
                        {isMutating ? '…' : record.isVisible ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {toggleMutation.isError && (
          <p className="text-red-400 text-sm">
            Failed to update page visibility. Please try again.
          </p>
        )}
      </div>

      {/* Confirmation dialog */}
      {pendingToggle && !toggleMutation.isPending && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-yellow-400" />
              <h3 className="text-white text-lg font-semibold">
                {pendingToggle.isVisible ? 'Show Page' : 'Hide Page'}
              </h3>
            </div>

            <p className="text-gray-300 text-sm mb-2">
              {pendingToggle.isVisible ? (
                <>
                  Make{' '}
                  <span className="font-semibold text-white">
                    {PAGE_LABELS[pendingToggle.pageKey]}
                  </span>{' '}
                  visible to all eligible roles?
                </>
              ) : (
                <>
                  Hide{' '}
                  <span className="font-semibold text-white">
                    {PAGE_LABELS[pendingToggle.pageKey]}
                  </span>{' '}
                  from all non-Super-Admin users?
                </>
              )}
            </p>

            {!pendingToggle.isVisible && (
              <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-3 mb-5 text-sm text-yellow-300">
                The page will be removed from the navigation and any direct URL access will be
                blocked for non-Super-Admin users.
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors text-white ${
                  pendingToggle.isVisible
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                Confirm
              </button>
              <button
                onClick={() => setPendingToggle(null)}
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

export default PageVisibilityManagement;
