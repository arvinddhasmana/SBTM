import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Settings, Bell, Clock, GitBranch, FileText, TrendingUp, Shield } from 'lucide-react';
import Header from '../components/common/Header';
import { alertConfigApi } from '../services/api/alert-config.api';
import { useAuth } from '../context/AuthContext';

export const AlertConfigDashboard: React.FC = () => {
  const { t } = useTranslation(['alertConfig']);
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
      title: t('alertConfig:sections.eventTypes.title'),
      description: t('alertConfig:sections.eventTypes.description'),
      icon: Settings,
      path: '/alert-config/event-types',
      color: 'bg-blue-500',
      count: eventTypes?.length || 0,
      enabled: true,
    },
    {
      title: t('alertConfig:sections.escalationTiming.title'),
      description: t('alertConfig:sections.escalationTiming.description'),
      icon: Clock,
      path: '/alert-config/escalation-timing',
      color: 'bg-orange-500',
      count: escalationConfigs?.length || 0,
      enabled: true,
    },
    {
      title: t('alertConfig:sections.notificationRouting.title'),
      description: t('alertConfig:sections.notificationRouting.description'),
      icon: Bell,
      path: '/alert-config/notification-routing',
      color: 'bg-green-500',
      count: notificationRouting?.length || 0,
      enabled: true,
    },
    {
      title: t('alertConfig:sections.workflow.title'),
      description: t('alertConfig:sections.workflow.description'),
      icon: GitBranch,
      path: '/alert-config/workflow',
      color: 'bg-purple-500',
      count: workflowConfigs?.length || 0,
      enabled: true,
    },
    {
      title: t('alertConfig:sections.auditLog.title'),
      description: t('alertConfig:sections.auditLog.description'),
      icon: FileText,
      path: '/alert-config/audit',
      color: 'bg-gray-500',
      count: null,
      enabled: isSuperAdmin,
    },
    {
      title: t('alertConfig:sections.changeRequests.title'),
      description: t('alertConfig:sections.changeRequests.description'),
      icon: TrendingUp,
      path: '/alert-config/change-requests',
      color: 'bg-yellow-500',
      count: changeRequests?.length || 0,
      enabled: true,
      badge:
        changeRequests && changeRequests.length > 0
          ? t('alertConfig:sections.changeRequests.badge')
          : null,
    },
  ];

  return (
    <>
      <Header
        title={t('alertConfig:title')}
        action={
          isSuperAdmin &&
          cacheStatus && (
            <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400">{t('alertConfig:cacheStatus')}</div>
              <div className="text-white font-medium">
                {cacheStatus.initialized
                  ? t('alertConfig:cacheInitialized')
                  : t('alertConfig:cacheNotInitialized')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t('alertConfig:cacheDetails', {
                  eventTypeCount: cacheStatus.eventTypeCount,
                  escalationConfigCount: cacheStatus.escalationConfigCount,
                })}
              </div>
            </div>
          )
        }
      />
      <div className="p-6">
        <div className="mb-8">
          <p className="text-gray-400">
            {isSuperAdmin ? t('alertConfig:subtitle.admin') : t('alertConfig:subtitle.readOnly')}
          </p>
        </div>

        {!isSuperAdmin && (
          <div className="mb-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-semibold">{t('alertConfig:readOnlyAccess')}</h3>
                <p className="text-gray-400 text-sm mt-1">{t('alertConfig:readOnlyDescription')}</p>
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
                  <div
                    className={`${section.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}
                  >
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
            <h2 className="text-xl font-semibold text-white mb-4">
              {t('alertConfig:quickActions.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={async () => {
                  if (confirm(t('alertConfig:quickActions.invalidateCacheConfirm'))) {
                    await alertConfigApi.invalidateCache();
                    window.location.reload();
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                {t('alertConfig:quickActions.invalidateCache')}
              </button>
              <Link
                to="/alert-config/audit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors text-center"
              >
                {t('alertConfig:quickActions.viewAuditLog')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AlertConfigDashboard;
