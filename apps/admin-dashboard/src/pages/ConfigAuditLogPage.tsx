import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Filter } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { ConfigAuditLog } from '../types/alert-config';
import { Header } from '../components/common';

export const ConfigAuditLogPage: React.FC = () => {
  const { t } = useTranslation(['alertConfig']);
  const [configType, setConfigType] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);

  // Fetch audit logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['alertConfig', 'audit', configType, limit],
    queryFn: () => alertConfigApi.getConfigAuditLog(configType || undefined, undefined, limit),
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatAction = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-900/50 text-green-300',
      UPDATE: 'bg-blue-900/50 text-blue-300',
      DELETE: 'bg-red-900/50 text-red-300',
    };
    return colors[action] || 'bg-gray-900/50 text-gray-300';
  };

  return (
    <>
      <Header
        title={t('alertConfig:auditLog.title')}
        subtitle={t('alertConfig:auditLog.subtitle')}
      />
      <div className="p-6">
        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Filter size={20} className="text-gray-400" />
            <h3 className="text-white font-semibold">{t('alertConfig:auditLog.filters.title')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('alertConfig:auditLog.filters.configType')}
              </label>
              <select
                value={configType}
                onChange={(e) => setConfigType(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="">{t('alertConfig:auditLog.filters.allTypes')}</option>
                <option value="alert_event_type_config">
                  {t('alertConfig:auditLog.filters.types.eventType')}
                </option>
                <option value="alert_escalation_config">
                  {t('alertConfig:auditLog.filters.types.escalation')}
                </option>
                <option value="notification_routing_config">
                  {t('alertConfig:auditLog.filters.types.notificationRouting')}
                </option>
                <option value="alert_workflow_config">
                  {t('alertConfig:auditLog.filters.types.workflow')}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('alertConfig:auditLog.filters.limit')}
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value={25}>{t('alertConfig:auditLog.filters.limitOptions.25')}</option>
                <option value={50}>{t('alertConfig:auditLog.filters.limitOptions.50')}</option>
                <option value={100}>{t('alertConfig:auditLog.filters.limitOptions.100')}</option>
                <option value={200}>{t('alertConfig:auditLog.filters.limitOptions.200')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        {isLoading ? (
          <div className="text-white">{t('alertConfig:auditLog.loading')}</div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('alertConfig:auditLog.table.timestamp')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('alertConfig:auditLog.table.action')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('alertConfig:auditLog.table.configType')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('alertConfig:auditLog.table.configId')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('alertConfig:auditLog.table.changedBy')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t('alertConfig:auditLog.table.role')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {logs && logs.length > 0 ? (
                    logs.map((log, index) => (
                      <tr key={log.id || index} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(log.changedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${formatAction(
                              log.action,
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                          {log.configTable}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                          {log.configId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {log.changedByUserId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                            {log.changedByRole?.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        {t('alertConfig:auditLog.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {logs && logs.length > 0 && (
          <div className="mt-4 text-sm text-gray-400">
            {t('alertConfig:auditLog.showing', { count: logs.length })}
          </div>
        )}
      </div>
    </>
  );
};

export default ConfigAuditLogPage;
