import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { fleetAssignmentApi } from '../../services/api/fleet-assignment.api';
import type {
  FleetAssignment,
  ProposeFleetAssignmentDto,
} from '../../services/api/fleet-assignment.api';
import { useAuth } from '../../context/AuthContext';
import { queryKeys } from '../../services/query-keys';
import { apiClient } from '../../services/api/api-client';

const STATUS_STYLES: Record<string, string> = {
  PROPOSED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  ACCEPTED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  SUPERSEDED: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

export const FleetAssignments: React.FC = () => {
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

  const handleDownloadPdf = useCallback(async (assignmentId: string) => {
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
      setError('Failed to download PDF.');
    }
  }, []);

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
      setError('Failed to create proposal.');
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
      setError('Failed to accept assignment.');
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
      setError('Failed to reject assignment.');
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Fleet Assignments</h1>
        {isOstaAdmin && (
          <button
            onClick={() => setShowProposalForm(!showProposalForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
          >
            <Plus size={18} />
            Create Proposal
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {showProposalForm && isOstaAdmin && (
        <div className="mb-6 bg-dashboard-card rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-bold text-white mb-4">New Assignment Proposal</h2>
          <form onSubmit={handlePropose} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                School ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formSchoolId}
                onChange={(e) => setFormSchoolId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                placeholder="Enter school ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Route ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formRouteId}
                onChange={(e) => setFormRouteId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                placeholder="Enter route ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Vehicle ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formVehicleId}
                onChange={(e) => setFormVehicleId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
                placeholder="Enter vehicle ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Effective Date
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
                Cancel
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
                {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-white/60">Loading...</div>
      ) : (
        <div className="bg-dashboard-card rounded-xl overflow-hidden border border-white/10">
          <table className="w-full text-left text-white">
            <thead className="bg-white/5 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">School</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Effective Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {displayedAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{assignment.schoolId}</td>
                  <td className="px-6 py-4 font-mono text-xs">{assignment.routeId}</td>
                  <td className="px-6 py-4 font-mono text-xs">{assignment.vehicleId}</td>
                  <td className="px-6 py-4 text-sm">{assignment.effectiveDate || '\u2014'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${STATUS_STYLES[assignment.status] || STATUS_STYLES.PROPOSED}`}
                    >
                      {assignment.status}
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
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(assignment.id);
                              setRejectNotes('');
                            }}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {assignment.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleDownloadPdf(assignment.id)}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                        >
                          <Download size={14} />
                          PDF
                        </button>
                      )}
                    </div>
                    {rejectingId === assignment.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          placeholder="Rejection notes..."
                          className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500 w-40"
                        />
                        <button
                          onClick={() => handleRejectSubmit(assignment.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => setRejectingId(null)}
                          className="text-white/40 hover:text-white/70 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {displayedAssignments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-white/50">
                    No fleet assignments found.
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
