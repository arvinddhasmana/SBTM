import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PresenceEvent } from '../../services/api/presence.api';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

interface PresenceTableProps {
  events: PresenceEvent[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  routeNames?: Record<string, string>;
}

export const PresenceTable: React.FC<PresenceTableProps> = ({
  events,
  total,
  page,
  limit,
  onPageChange,
  loading,
  routeNames = {},
}) => {
  const { t } = useTranslation(['students']);
  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (type: 'BOARD' | 'ALIGHT') => {
    const styles = {
      BOARD: 'bg-green-500/20 text-green-400 border-green-500/30',
      ALIGHT: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    };
    const labels = {
      BOARD: t('students:presenceTable.onBus'),
      ALIGHT: t('students:presenceTable.droppedOff'),
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">
                {t('students:presenceTable.columns.student')}
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">
                {t('students:presenceTable.columns.grade')}
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">
                {t('students:presenceTable.columns.status')}
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">
                {t('students:presenceTable.columns.routeBus')}
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">
                {t('students:presenceTable.columns.timestamp')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-4 h-12 bg-white/5"></td>
                </tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  {t('students:presenceTable.noEvents')}
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">
                      {event.firstName} {event.lastName}
                    </p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      {event.id.substring(0, 8)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{event.grade}</td>
                  <td className="px-6 py-4">{getStatusBadge(event.eventType)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300">
                      {routeNames[event.routeId] || 'Unknown Route'}
                    </p>
                    <p className="text-xs text-slate-500">{event.vehicleId}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {dateFormatter.format(new Date(event.timestamp))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {t('students:presenceTable.showing')}{' '}
          <span className="font-medium text-white">{events.length}</span>{' '}
          {t('students:presenceTable.of')} <span className="font-medium text-white">{total}</span>{' '}
          {t('students:presenceTable.results')}
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1 || loading}
            className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
          >
            {t('students:presenceTable.previous')}
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || loading}
            className="btn-secondary py-1 px-3 text-xs disabled:opacity-50"
          >
            {t('students:presenceTable.next')}
          </button>
        </div>
      </div>
    </div>
  );
};
