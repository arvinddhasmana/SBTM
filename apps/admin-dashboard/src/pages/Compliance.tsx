import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, CheckCircle, AlertTriangle, FileText, Search, Filter } from 'lucide-react';
import { Header, Card, LoadingSpinner } from '../components/common';
import { complianceApi } from '../services/api';
import { queryKeys } from '../services/query-keys';

const Compliance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'inspections' | 'audit'>('drivers');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.compliance.all,
    queryFn: async () => {
      const [dData, iData, aData] = await Promise.all([
        complianceApi.getAllCompliance(),
        complianceApi.getAllInspections(),
        complianceApi.getAuditLogs(),
      ]);
      return { drivers: dData, inspections: iData, auditLogs: aData };
    },
  });

  const drivers: any[] = data?.drivers ?? [];
  const inspections: any[] = data?.inspections ?? [];
  const auditLogs: any[] = data?.auditLogs ?? [];

  if (isLoading) {
    return (
      <>
        <Header title="Compliance & Safety" />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text="Loading compliance data..." />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Compliance & Safety"
        subtitle="Monitor driver certifications, vehicle safety inspections, and system audit logs"
      />

      <div className="p-6 space-y-6">
        {/* Tab Switcher */}
        <div className="flex gap-4 p-1 bg-dashboard-card border border-dashboard-border rounded-xl w-fit">
          {(['drivers', 'inspections', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
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
                  <p className="text-sm text-slate-400">Compliant Drivers</p>
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
                  <p className="text-sm text-slate-400">Expiring Soon</p>
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
                  <p className="text-sm text-slate-400">Expired Docs</p>
                </div>
              </Card>
            </div>

            <Card title="Driver Compliance Status">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dashboard-border">
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Driver ID</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">License Expiry</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">
                        Background Check
                      </th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Medical Due</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Status</th>
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
                            {driver.status}
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
            <Card title="Recent Vehicle Inspections">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dashboard-border">
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Date</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Vehicle</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Driver</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Type</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Result</th>
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
                            {ins.is_passed ? 'PASS' : 'FAIL'}
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
            <Card title="System Audit Logs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dashboard-border">
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Timestamp</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">User</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Action</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Resource</th>
                      <th className="py-4 px-4 text-sm font-bold text-slate-400">Details</th>
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
