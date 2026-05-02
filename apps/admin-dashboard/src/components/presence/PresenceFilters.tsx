import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter } from 'lucide-react';

interface PresenceFiltersProps {
  filters: {
    studentName: string;
    routeId: string;
    eventType: string;
  };
  onFilterChange: (name: string, value: string) => void;
}

export const PresenceFilters: React.FC<PresenceFiltersProps> = ({ filters, onFilterChange }) => {
  const { t } = useTranslation(['students']);

  return (
    <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[240px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('students:presenceFilters.searchPlaceholder')}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          value={filters.studentName}
          onChange={(e) => onFilterChange('studentName', e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
            value={filters.eventType}
            onChange={(e) => onFilterChange('eventType', e.target.value)}
          >
            <option value="">{t('students:presenceFilters.allEvents')}</option>
            <option value="BOARD">{t('students:presenceFilters.boarded')}</option>
            <option value="ALIGHT">{t('students:presenceFilters.alighted')}</option>
          </select>
        </div>

        <select
          className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
          value={filters.routeId}
          onChange={(e) => onFilterChange('routeId', e.target.value)}
        >
          <option value="">{t('students:presenceFilters.allRoutes')}</option>
          <option value="R-101">Route 101</option>
          <option value="R-102">Route 102</option>
        </select>
      </div>
    </div>
  );
};
