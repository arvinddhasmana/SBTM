import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header, Card, LoadingSpinner } from '../components/common';
import { complianceApi } from '../services/api';
import { queryKeys } from '../services/query-keys';

const Compliance: React.FC = () => {
  const { t } = useTranslation(['compliance', 'common']);
  const [activeTab, setActiveTab] = useState<'drivers' | 'inspections' | 'audit'>('drivers');

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.compliance.all,
    queryFn: async () => {
      const [dData, iData, aData] = await Promise.all([
        complianceApi.getAllCompliance().catch(() => []),
        complianceApi.getAllInspections().catch(() => []),
        complianceApi.getAuditLogs().catch(() => []),
      ]);
      return {
        drivers: Array.isArray(dData) ? dData : [],
        inspections: Array.isArray(iData) ? iData : [],
        auditLogs: Array.isArray(aData) ? aData : [],
      };
    },
  });

  const drivers: any[] = data?.drivers ?? [];
  const inspections: any[] = data?.inspections ?? [];
  const auditLogs: any[] = data?.auditLogs ?? [];

  if (isLoading) {
    return (
      <>
        <Header title={t('compliance:title')} />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text={t('compliance:loading')} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={t('compliance:title')}
        subtitle={t('compliance:subtitle')}
      />

      <div className="p-6 space-y-6">
        {/* Tab Switcher */}
        <div className="flex gap-4 p-1 bg-dashboard-card border border-dashboard-border rounded-xl w-fit">
          {(['drivers', 'inspections', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t(`compliance:tabs.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'drivers' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20 text-green-500">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {drivers.filter((d) => d.status === 'VALID').length}
                  </p>
                  <p className="text-sm text-slate-400">{t('compliance:metrics.compliantDrivers')}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/20 text-yellow-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {drivers.filter((d) => d.status === 'EXPIRING_SOON').length}
                  </p>
                  <p className="text-sm text-slate-400">{t('compliance:metrics.expiringSoon')}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/20 text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {drivers.filter((d) => d.status === 'EXPIRED').length}
                  </p>
                  <p className="text-sm text-slate-400">{t('compliance:metrics.expiredDocs')}</p>
                </div>
              </Card>
            </div>

            <Card title={t('compliance:cardTitles.driverComplianceStatus')}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dashboard-border">
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.driverId')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.licenseExpiry')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">
                        {t('compliance:table.backgroundCheck')}
                      </th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.medicalDue')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:driver.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashboard-border">
                    {drivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 text-sm text-white font-medium">
                          {driver.driver_id}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-300">
                          {new Date(driver.license_expiry).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-300">
                          {new Date(driver.background_check_last_date).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-300">
                          {new Date(driver.medical_check_due_date).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              driver.status === 'VALID'
                                ? 'bg-green-500/20 text-green-500'
                                : driver.status === 'EXPIRING_SOON'
                                  ? 'bg-yellow-500/20 text-yellow-500'
                                  : 'bg-red-500/20 text-red-500'
                            }`}
                          >
                            {t(`compliance:status.${driver.status}`)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <Card title={t('compliance:cardTitles.recentInspections')}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dashboard-border">
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.date')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.vehicle')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.driver')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.type')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.result')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashboard-border">
                    {inspections.map((ins) => (
                      <tr key={ins.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 text-sm text-white">
                          {new Date(ins.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-300">{ins.vehicle_id}</td>
                        <td className="py-4 px-4 text-sm text-slate-300">{ins.driver_id}</td>
                        <td className="py-4 px-4 text-sm text-slate-300">{ins.type}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              ins.is_passed
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-red-500/20 text-red-500'
                            }`}
                          >
                            {ins.is_passed ? t('compliance:inspection.pass') : t('compliance:inspection.fail')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <Card title={t('compliance:cardTitles.systemAuditLogs')}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dashboard-border">
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.timestamp')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.user')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.action')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.resource')}</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">{t('compliance:table.details')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashboard-border">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 text-sm text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-sm text-white">{log.user_id}</td>
                        <td className="py-4 px-4 text-sm font-bold text-primary-400">
                          {log.action}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-300">{log.resource}</td>
                        <td className="py-4 px-4 text-sm text-slate-400 max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default Compliance;
