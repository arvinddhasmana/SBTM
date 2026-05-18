import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { organizationApi } from '../../services/api/organization.api';
import type { Board, School } from '../../services/api/organization.api';
import { getBoardScope } from '../../types';

interface TenantStats {
  boardCount: number;
  schoolCount: number;
  schoolsByBoard: Record<string, number>;
}

const StatCard: React.FC<{ label: string; value: string | number; sub?: string }> = ({
  label,
  value,
  sub,
}) => (
  <div className="bg-dashboard-card rounded-xl p-5 border border-white/10">
    <p className="text-xs text-white/60 uppercase font-semibold mb-1">{label}</p>
    <p className="text-3xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
  </div>
);

export const TenantDashboard: React.FC = () => {
  const { t } = useTranslation(['dashboard']);
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isStaAdmin = user?.role === 'STA_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isBoardAdmin = user?.role === 'BOARD_ADMIN';

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (isStaAdmin) {
          const [boardsData, schoolsData] = await Promise.all([
            organizationApi.listBoards(),
            organizationApi.listSchools(),
          ]);
          setBoards(boardsData);
          setSchools(schoolsData);
        } else if (isBoardAdmin) {
          const boardScope = getBoardScope(user);
          if (boardScope) {
            const schoolsData = await organizationApi.listSchools(boardScope);
            setSchools(schoolsData);
          }
        }
      } catch {
        setError(t('dashboard:tenantDashboard.errorLoad'));
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats: TenantStats = {
    boardCount: boards.length,
    schoolCount: schools.length,
    schoolsByBoard: schools.reduce<Record<string, number>>((acc, s) => {
      acc[s.boardId] = (acc[s.boardId] ?? 0) + 1;
      return acc;
    }, {}),
  };

  if (isLoading) {
    return <div className="p-8 text-white/60">{t('dashboard:tenantDashboard.loading')}</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          {isStaAdmin
            ? t('dashboard:tenantDashboard.titleSta')
            : t('dashboard:tenantDashboard.titleBoard')}
        </h1>
        <p className="text-white/50 text-sm mt-1">
          {isStaAdmin
            ? t('dashboard:tenantDashboard.subtitleSta')
            : t('dashboard:tenantDashboard.subtitleBoard', { boardId: getBoardScope(user) ?? '—' })}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {isStaAdmin && (
          <StatCard
            label={t('dashboard:tenantDashboard.statTotalBoards')}
            value={stats.boardCount}
            sub={t('dashboard:tenantDashboard.statTotalBoardsSub')}
          />
        )}
        <StatCard
          label={t('dashboard:tenantDashboard.statTotalSchools')}
          value={stats.schoolCount}
          sub={
            isStaAdmin
              ? t('dashboard:tenantDashboard.statTotalSchoolsSubSta')
              : t('dashboard:tenantDashboard.statTotalSchoolsSubBoard')
          }
        />
        {isStaAdmin && (
          <StatCard
            label={t('dashboard:tenantDashboard.statAvgSchools')}
            value={stats.boardCount > 0 ? (stats.schoolCount / stats.boardCount).toFixed(1) : '—'}
            sub={t('dashboard:tenantDashboard.statAvgSchoolsSub')}
          />
        )}
      </div>

      {isStaAdmin && boards.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-3">
            {t('dashboard:tenantDashboard.boardsHeading')}
          </h2>
          <div className="bg-dashboard-card rounded-xl overflow-hidden border border-white/10 mb-8">
            <table className="w-full text-left text-white">
              <thead className="bg-white/5 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('dashboard:tenantDashboard.colBoardName')}</th>
                  <th className="px-6 py-4">{t('dashboard:tenantDashboard.colSchools')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {boards.map((board) => (
                  <tr key={board.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">{board.name}</td>
                    <td className="px-6 py-4 text-white/60">
                      {stats.schoolsByBoard[board.id] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {schools.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-3">
            {t('dashboard:tenantDashboard.schoolsHeading')}
          </h2>
          <div className="bg-dashboard-card rounded-xl overflow-hidden border border-white/10">
            <table className="w-full text-left text-white">
              <thead className="bg-white/5 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('dashboard:tenantDashboard.colSchoolName')}</th>
                  {isStaAdmin && (
                    <th className="px-6 py-4">{t('dashboard:tenantDashboard.colBoard')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {schools.map((school) => {
                  const board = boards.find((b) => b.id === school.boardId);
                  return (
                    <tr key={school.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">{school.name}</td>
                      {isStaAdmin && (
                        <td className="px-6 py-4 text-white/60 text-sm">
                          {board?.name ?? school.boardId}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!isLoading && schools.length === 0 && boards.length === 0 && (
        <div className="text-center text-white/40 py-12">
          {t('dashboard:tenantDashboard.empty')}
        </div>
      )}
    </div>
  );
};
