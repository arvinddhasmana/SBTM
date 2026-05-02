import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../common';
import { Users, LogIn, LogOut, HelpCircle } from 'lucide-react';

interface PresenceStatsProps {
  stats: {
    totalStudents: number;
    boarded: number;
    alighted: number;
    unknown: number;
  };
  loading?: boolean;
}

export const PresenceStats: React.FC<PresenceStatsProps> = ({ stats, loading }) => {
  const { t } = useTranslation(['students']);

  const statItems = [
    {
      label: t('students:presenceStats.totalTracked'),
      value: stats.totalStudents,
      icon: <Users className="w-6 h-6 text-blue-400" />,
      color: 'blue',
    },
    {
      label: t('students:presenceStats.boarded'),
      value: stats.boarded,
      icon: <LogIn className="w-6 h-6 text-green-400" />,
      color: 'green',
    },
    {
      label: t('students:presenceStats.alighted'),
      value: stats.alighted,
      icon: <LogOut className="w-6 h-6 text-indigo-400" />,
      color: 'indigo',
    },
    {
      label: t('students:presenceStats.unknown'),
      value: stats.unknown,
      icon: <HelpCircle className="w-6 h-6 text-slate-400" />,
      color: 'slate',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div key={index} className="glass-card p-4 flex items-center space-x-4">
          <div
            className={`p-3 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20`}
          >
            {item.icon}
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">{item.label}</p>
            <h3 className="text-2xl font-bold text-white">
              {loading ? '...' : item.value.toLocaleString()}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
};
