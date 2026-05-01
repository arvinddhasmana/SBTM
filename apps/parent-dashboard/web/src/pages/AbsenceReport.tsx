import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { parentApi } from '../services/api';
import type { AbsenceReportPayload } from '../services/api';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const AbsenceReport: React.FC = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string>(user?.children?.[0]?.id ?? '');
  const [tripDate, setTripDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [routeType, setRouteType] = useState<AbsenceReportPayload['routeType']>('BOTH');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.children.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">
        {t('absence.noChildren')}
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChildId) {
      setError(t('absence.errorSelectChild'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await parentApi.reportAbsence({
        studentId: selectedChildId,
        tripDate,
        routeType,
        notes: notes.trim() || undefined,
      });
      setSuccess(t('absence.success'));
      setNotes('');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('absence.error');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 sm:px-0 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('absence.title')}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {t('absence.subtitle')}
      </p>

      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('absence.child')}</label>
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {user.children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('absence.date')}</label>
          <input
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('absence.route')}</label>
          <select
            value={routeType}
            onChange={(e) => setRouteType(e.target.value as AbsenceReportPayload['routeType'])}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="AM">{t('absence.routeTypes.AM')}</option>
            <option value="PM">{t('absence.routeTypes.PM')}</option>
            <option value="BOTH">{t('absence.routeTypes.BOTH')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('absence.notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('absence.notesPlaceholder')}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {isSubmitting ? t('absence.submitting') : t('absence.submit')}
        </button>
      </form>
    </div>
  );
};

export default AbsenceReport;
