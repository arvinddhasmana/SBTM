import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fleetAssignmentApi } from '../../services/api/fleet-assignment.api';
import type {
  FleetAssignment,
  ProposeFleetAssignmentDto,
} from '../../services/api/fleet-assignment.api';
import { useAuth } from '../../context/AuthContext';
import { queryKeys } from '../../services/query-keys';
import { apiClient } from '../../services/api/api-client';

import Header from '../../components/common/Header';

const STATUS_STYLES: Record<string, string> = {
  PROPOSED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  ACCEPTED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  SUPERSEDED: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

export const FleetAssignments: React.FC = () => {
  const { t } = useTranslation(['fleet']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Proposal form state
  const [formSchoolId, setFormSchoolId] = useState('');
  const [formRouteId, setFormRouteId] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOstaAdmin = user?.role === 'OSTA_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';

  const handleDownloadPdf = useCallback(
    async (assignmentId: string) => {
      try {
        const response = await apiClient.get(
          `/api/v1/documents/fleet-assignment/${assignmentId}/pdf`,
          { responseType: 'blob' },
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `fleet-assignment-${assignmentId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch {
        setError(t('fleet:assignments.errors.downloadPdfFailed'));
      }
    },
    [t],
  );

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: queryKeys.fleetAssignments.all,
    queryFn: () => fleetAssignmentApi.list(),
  });

  const displayedAssignments = isSchoolAdmin
    ? assignments.filter((a) => a.schoolId === user?.schoolId)
    : assignments;

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const dto: ProposeFleetAssignmentDto = {
        schoolId: formSchoolId,
        routeId: formRouteId,
        vehicleId: formVehicleId,
        ...(formEffectiveDate ? { effectiveDate: formEffectiveDate } : {}),
      };
      await fleetAssignmentApi.propose(dto);
      setShowProposalForm(false);
      setFormSchoolId('');
      setFormRouteId('');
      setFormVehicleId('');
      setFormEffectiveDate('');
      queryClient.invalidateQueries({ queryKey: queryKeys.fleetAssignments.all });
    } catch {
      setError(t('fleet:assignments.errors.proposeFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      setError(null);
      await fleetAssignmentApi.accept(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.fleetAssignments.all });
    } catch {
      setError(t('fleet:assignments.errors.acceptFailed'));
    }
  };

  const handleRejectSubmit = async (id: string) => {
    try {
      setError(null);
      await fleetAssignmentApi.reject(id, rejectNotes || undefined);
      setRejectingId(null);
      setRejectNotes('');
      queryClient.invalidateQueries({ queryKey: queryKeys.fleetAssignments.all });
    } catch {
      setError(t('fleet:assignments.errors.rejectFailed'));
    }
  };

  return (
    <>
      <Header
        title={t('fleet:assignments.title')}
        action={
          isOstaAdmin && (
            <button
              onClick={() => setShowProposalForm(!showProposalForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
            >
              <Plus size={18} />
              {t('fleet:assignments.createProposal')}
            </button>
          )
        }
      />
      <div className="p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {showProposalForm && isOstaAdmin && (
          <div className="mb-6 bg-dashboard-card rounded-xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              {t('fleet:assignments.newProposalTitle')}
            </h2>
            <form onSubmit={handlePropose} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  {t('fleet:assignments.form.schoolId')}{' '}
                  <span className="text-red-400">{t('fleet:assignments.form.required')}</span>
                </label>
                <input
                  type="text"
                  value={formSchoolId}
                  onChange={(e) => setFormSchoolId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                  placeholder={t('fleet:assignments.form.schoolIdPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  {t('fleet:assignments.form.routeId')}{' '}
                  <span className="text-red-400">{t('fleet:assignments.form.required')}</span>
                </label>
                <input
                  type="text"
                  value={formRouteId}
                  onChange={(e) => setFormRouteId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                  placeholder={t('fleet:assignments.form.routeIdPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  {t('fleet:assignments.form.vehicleId')}{' '}
                  <span className="text-red-400">{t('fleet:assignments.form.required')}</span>
                </label>
                <input
                  type="text"
                  value={formVehicleId}
                  onChange={(e) => setFormVehicleId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                  placeholder={t('fleet:assignments.form.vehicleIdPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  {t('fleet:assignments.form.effectiveDate')}
                </label>
                <input
                  type="date"
                  value={formEffectiveDate}
                  onChange={(e) => setFormEffectiveDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProposalForm(false)}
                  className="px-6 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  {t('fleet:assignments.form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-xl font-bold bg-primary-500 text-white transition-all ${
                    isSubmitting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                  }`}
                >
                  {isSubmitting
                    ? t('fleet:assignments.form.submitting')
                    : t('fleet:assignments.form.submitProposal')}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="text-white/60">{t('fleet:assignments.loading')}</div>
        ) : (
          <div className="bg-dashboard-card rounded-xl overflow-hidden border border-white/10">
            <table className="w-full text-left text-white">
              <thead className="bg-white/5 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('fleet:assignments.table.school')}</th>
                  <th className="px-6 py-4">{t('fleet:assignments.table.route')}</th>
                  <th className="px-6 py-4">{t('fleet:assignments.table.vehicle')}</th>
                  <th className="px-6 py-4">{t('fleet:assignments.table.effectiveDate')}</th>
                  <th className="px-6 py-4">{t('fleet:assignments.table.status')}</th>
                  <th className="px-6 py-4">{t('fleet:assignments.table.created')}</th>
                  <th className="px-6 py-4">{t('fleet:assignments.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {displayedAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{assignment.schoolId}</td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {(assignment as any).routeName || 'Unknown Route'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{assignment.vehicleId}</td>
                    <td className="px-6 py-4 text-sm">{assignment.effectiveDate || '\u2014'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${STATUS_STYLES[assignment.status] || STATUS_STYLES.PROPOSED}`}
                      >
                        {t(`fleet:assignments.statuses.${assignment.status}`, {
                          defaultValue: assignment.status,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-white/50">
                      {new Date(assignment.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isSchoolAdmin && assignment.status === 'PROPOSED' && (
                          <>
                            <button
                              onClick={() => handleAccept(assignment.id)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              {t('fleet:assignments.actions.accept')}
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(assignment.id);
                                setRejectNotes('');
                              }}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              {t('fleet:assignments.actions.reject')}
                            </button>
                          </>
                        )}
                        {assignment.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleDownloadPdf(assignment.id)}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                          >
                            <Download size={14} />
                            {t('fleet:assignments.actions.pdf')}
                          </button>
                        )}
                      </div>
                      {rejectingId === assignment.id && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder={t('fleet:assignments.actions.rejectionNotesPlaceholder')}
                            className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500 w-40"
                          />
                          <button
                            onClick={() => handleRejectSubmit(assignment.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-bold"
                          >
                            {t('fleet:assignments.actions.submit')}
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="text-white/40 hover:text-white/70 text-xs"
                          >
                            {t('fleet:assignments.actions.cancel')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {displayedAssignments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-white/50">
                      {t('fleet:assignments.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
