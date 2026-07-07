import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { absenceApi } from '../../services/api/absence.api';
import type { AbsenceRecord } from '../../services/api/absence.api';
import { useAuth } from '../../context/AuthContext';
import { getSchoolScope } from '../../types';
import { queryKeys } from '../../services/query-keys';
import { studentManagementApi } from '../../services/api/student-management.api';

const StudentNameDisplay: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentManagementApi.getStudentById(studentId),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
  if (!student) return <span className="font-mono text-xs">Loading...</span>;
  return (
    <span className="font-semibold text-white">
      {student.preferred_name || student.first_name + ' ' + student.last_name}
    </span>
  );
};
import { Header } from '../../components/common';

export const AbsenceManagement: React.FC = () => {
  const { t } = useTranslation(['absences']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>(
    () => new Date().toISOString().split('T')[0],
  );
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const schoolId = getSchoolScope(user);
  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';
  const absenceQueryKey = queryKeys.absences.byDate(filterDate || undefined, schoolId);

  const { data: absences = [], isLoading } = useQuery({
    queryKey: absenceQueryKey,
    queryFn: () => absenceApi.listAbsences(filterDate || undefined, schoolId),
  });

  const handleDelete = async (absence: AbsenceRecord) => {
    if (!window.confirm(t('absences:removeConfirm'))) return;
    try {
      await absenceApi.deleteAbsence(absence.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.absences.all });
    } catch {
      setError(t('absences:errors.removeFailed'));
    }
  };

  const handleConfirm = async (absence: AbsenceRecord) => {
    try {
      setError(null);
      await absenceApi.confirmAbsence(absence.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.absences.all });
    } catch {
      setError(t('absences:errors.confirmFailed'));
    }
  };

  const handleRejectSubmit = async (id: string) => {
    try {
      setError(null);
      await absenceApi.rejectAbsence(id, rejectNotes || undefined);
      setRejectingId(null);
      setRejectNotes('');
      queryClient.invalidateQueries({ queryKey: queryKeys.absences.all });
    } catch {
      setError(t('absences:errors.rejectFailed'));
    }
  };

  return (
    <>
      <Header title={t('absences:title')} />
      <div className="p-8">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <label className="text-white/60 text-sm">{t('absences:dateLabel')}</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => setFilterDate('')}
              className="text-white/40 hover:text-white/70 text-xs"
            >
              {t('absences:allDates')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-white/60">{t('absences:loading')}</div>
        ) : (
          <div className="bg-dashboard-card rounded-xl overflow-hidden border border-white/10">
            <table className="w-full text-left text-white">
              <thead className="bg-white/5 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">
                    {t('absences:columns.studentName', { defaultValue: 'Student Name' })}
                  </th>
                  <th className="px-6 py-4">{t('absences:columns.tripDate')}</th>
                  <th className="px-6 py-4">{t('absences:columns.route')}</th>
                  <th className="px-6 py-4">{t('absences:columns.status')}</th>
                  <th className="px-6 py-4">{t('absences:columns.notes')}</th>
                  <th className="px-6 py-4">{t('absences:columns.reported')}</th>
                  <th className="px-6 py-4">{t('absences:columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {absences.map((absence) => {
                  const status = absence.confirmationStatus || 'PENDING';
                  const statusStyles: Record<string, string> = {
                    PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                    CONFIRMED: 'bg-green-500/10 text-green-400 border border-green-500/20',
                    REJECTED: 'bg-red-500/10 text-red-400 border border-red-500/20',
                  };
                  return (
                    <tr key={absence.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <StudentNameDisplay studentId={absence.studentId} />
                      </td>
                      <td className="px-6 py-4 text-sm">{absence.tripDate}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-1 rounded">
                          {t(`absences:routeTypes.${absence.routeType}`, {
                            defaultValue: absence.routeType,
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${statusStyles[status] || statusStyles['PENDING']}`}
                        >
                          {t(`absences:statuses.${status}`, { defaultValue: status })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70 max-w-xs truncate">
                        {absence.confirmationNotes || absence.notes || '\u2014'}
                      </td>
                      <td className="px-6 py-4 text-xs text-white/50">
                        {new Date(absence.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isSchoolAdmin && status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleConfirm(absence)}
                                className="text-green-400 hover:text-green-300 text-sm"
                              >
                                {t('absences:actions.confirm')}
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(absence.id);
                                  setRejectNotes('');
                                }}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                {t('absences:actions.reject')}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(absence)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            {t('absences:actions.remove')}
                          </button>
                        </div>
                        {rejectingId === absence.id && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={rejectNotes}
                              onChange={(e) => setRejectNotes(e.target.value)}
                              placeholder={t('absences:rejectionNotesPlaceholder')}
                              className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500 w-40"
                            />
                            <button
                              onClick={() => handleRejectSubmit(absence.id)}
                              className="text-red-400 hover:text-red-300 text-xs font-bold"
                            >
                              {t('absences:actions.submit')}
                            </button>
                            <button
                              onClick={() => setRejectingId(null)}
                              className="text-white/40 hover:text-white/70 text-xs"
                            >
                              {t('absences:actions.cancel')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {absences.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-white/50">
                      {filterDate
                        ? t('absences:noAbsencesForDate', { date: filterDate })
                        : t('absences:noAbsences')}
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
