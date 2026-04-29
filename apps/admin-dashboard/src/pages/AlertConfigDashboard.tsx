import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Bell,
  Clock,
  GitBranch,
  FileText,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { alertConfigApi } from '../services/api/alert-config.api';
import { useAuth } from '../context/AuthContext';

export const AlertConfigDashboard: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch cache status
  const { data: cacheStatus } = useQuery({
    queryKey: ['alertConfig', 'cacheStatus'],
    queryFn: () => alertConfigApi.getCacheStatus(),
    enabled: isSuperAdmin,
  });

  // Fetch configuration counts
  const { data: eventTypes } = useQuery({
    queryKey: ['alertConfig', 'eventTypes'],
    queryFn: () => alertConfigApi.getAllEventTypeConfigs(),
  });

  const { data: escalationConfigs } = useQuery({
    queryKey: ['alertConfig', 'escalationConfigs'],
    queryFn: () => alertConfigApi.getAllEscalationConfigs(),
  });

  const { data: notificationRouting } = useQuery({
    queryKey: ['alertConfig', 'notificationRouting'],
    queryFn: () => alertConfigApi.getAllNotificationRoutingConfigs(),
  });

  const { data: workflowConfigs } = useQuery({
    queryKey: ['alertConfig', 'workflowConfigs'],
    queryFn: () => alertConfigApi.getAllWorkflowConfigs(),
  });

  const { data: changeRequests } = useQuery({
    queryKey: ['alertConfig', 'changeRequests', 'pending'],
    queryFn: () => alertConfigApi.getAllChangeRequests('PENDING'),
  });

  const configSections = [
    {
      title: 'Event Type Configuration',
      description: 'Map emergency event types to alert tiers',
      icon: Settings,
      path: '/alert-config/event-types',
      color: 'bg-blue-500',
      count: eventTypes?.length || 0,
      enabled: true,
    },
    {
      title: 'Escalation Timing',
      description: 'Configure confirmation timeouts and escalation delays',
      icon: Clock,
      path: '/alert-config/escalation-timing',
      color: 'bg-orange-500',
      count: escalationConfigs?.length || 0,
      enabled: true,
    },
    {
      title: 'Notification Routing',
      description: 'Configure notification channels and recipients per tier',
      icon: Bell,
      path: '/alert-config/notification-routing',
      color: 'bg-green-500',
      count: notificationRouting?.length || 0,
      enabled: true,
    },
    {
      title: 'Workflow Configuration',
      description: 'Manage workflow actions and permissions',
      icon: GitBranch,
      path: '/alert-config/workflow',
      color: 'bg-purple-500',
      count: workflowConfigs?.length || 0,
      enabled: true,
    },
    {
      title: 'Configuration Audit Log',
      description: 'View history of all configuration changes',
      icon: FileText,
      path: '/alert-config/audit',
      color: 'bg-gray-500',
      count: null,
      enabled: isSuperAdmin,
    },
    {
      title: 'Change Requests',
      description: 'Review configuration change requests from admins',
      icon: TrendingUp,
      path: '/alert-config/change-requests',
      color: 'bg-yellow-500',
      count: changeRequests?.length || 0,
      enabled: true,
      badge: changeRequests && changeRequests.length > 0 ? 'Pending' : null,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Alert Configuration</h1>
          </div>
          {isSuperAdmin && cacheStatus && (
            <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400">Cache Status</div>
              <div className="text-white font-medium">
                {cacheStatus.initialized ? '✓ Initialized' : '✗ Not Initialized'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {cacheStatus.eventTypeCount} event types • {cacheStatus.escalationConfigCount}{' '}
                escalation configs
              </div>
            </div>
          )}
        </div>
        <p className="text-gray-400">
          {isSuperAdmin
            ? 'Manage alert and notification configuration settings'
            : 'View current alert and notification configuration settings'}
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="mb-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="text-yellow-400 font-semibold">Read-Only Access</h3>
              <p className="text-gray-400 text-sm mt-1">
                You have read-only access to configuration settings. To request changes, use the
                Change Requests section.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configSections
          .filter((section) => section.enabled)
          .map((section) => (
            <Link
              key={section.path}
              to={section.path}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${section.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <section.icon className="h-6 w-6 text-white" />
                </div>
                {section.count !== null && (
                  <div className="bg-gray-700 px-3 py-1 rounded-full">
                    <span className="text-white font-semibold">{section.count}</span>
                  </div>
                )}
                {section.badge && (
                  <div className="bg-yellow-500 px-3 py-1 rounded-full">
                    <span className="text-gray-900 font-semibold text-sm">{section.badge}</span>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {section.title}
              </h3>
              <p className="text-gray-400 text-sm">{section.description}</p>
            </Link>
          ))}
      </div>

      {isSuperAdmin && (
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to invalidate the configuration cache?')) {
                  await alertConfigApi.invalidateCache();
                  window.location.reload();
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Invalidate Cache
            </button>
            <Link
              to="/alert-config/audit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors text-center"
            >
              View Audit Log
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertConfigDashboard;
