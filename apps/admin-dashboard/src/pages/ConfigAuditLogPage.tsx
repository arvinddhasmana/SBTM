import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Filter } from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import type { ConfigAuditLog } from '../types/alert-config';

export const ConfigAuditLogPage: React.FC = () => {
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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Configuration Audit Log</h1>
        </div>
        <p className="text-gray-400">
          View the complete history of all configuration changes
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Filter size={20} className="text-gray-400" />
          <h3 className="text-white font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Configuration Type
            </label>
            <select
              value={configType}
              onChange={(e) => setConfigType(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="">All Types</option>
              <option value="alert_event_type_config">Event Type Config</option>
              <option value="alert_escalation_config">Escalation Config</option>
              <option value="notification_routing_config">Notification Routing</option>
              <option value="alert_workflow_config">Workflow Config</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
            >
              <option value={25}>25 entries</option>
              <option value={50}>50 entries</option>
              <option value={100}>100 entries</option>
              <option value={200}>200 entries</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="text-white">Loading audit logs...</div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Config Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Config ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Changed By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
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
                          {log.changedByRole}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      No audit log entries found.
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
          Showing {logs.length} entries
        </div>
      )}
    </div>
  );
};

export default ConfigAuditLogPage;
