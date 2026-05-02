import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header, Card, LoadingSpinner } from '../components/common';
import { AlertList, AlertDetail } from '../components/alerts';
import { alertsApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import { alertsWs } from '../services/websocket/alerts.ws';
import type { Alert, AlertEventType } from '../types';

type EventFilter = 'all' | AlertEventType;

const OperationalAlerts: React.FC = () => {
  const { t } = useTranslation(['alerts']);
  const queryClient = useQueryClient();

  const EVENT_FILTER_OPTIONS: { value: EventFilter; label: string }[] = [
    { value: 'all', label: t('alerts:operational.eventTypes.all') },
    { value: 'LATE_ARRIVAL', label: t('alerts:operational.eventTypes.LATE_ARRIVAL') },
    { value: 'LATE_DEPARTURE', label: t('alerts:operational.eventTypes.LATE_DEPARTURE') },
    { value: 'ROUTE_DEVIATION', label: t('alerts:operational.eventTypes.ROUTE_DEVIATION') },
    { value: 'ROUTE_DIVERSION', label: t('alerts:operational.eventTypes.ROUTE_DIVERSION') },
    { value: 'COMPLIANCE', label: t('alerts:operational.eventTypes.COMPLIANCE') },
    { value: 'OTHER', label: t('alerts:operational.eventTypes.OTHER') },
  ];
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [isResolving, setIsResolving] = useState(false);

  const selectedAlertIdRef = useRef<string | null>(null);
  selectedAlertIdRef.current = selectedAlert?.id ?? null;

  const { data: allAlerts = [], isLoading } = useQuery({
    queryKey: queryKeys.alerts.all,
    queryFn: () => alertsApi.getAllAlerts(),
  });

  // Audit trail with auto-refresh
  const { data: selectedAlertAudit = [] } = useQuery({
    queryKey: queryKeys.alerts.auditTrail(selectedAlert?.id ?? ''),
    queryFn: () => alertsApi.getAlertAuditLog(selectedAlert!.id),
    enabled: !!selectedAlert,
    refetchInterval: selectedAlert ? 10_000 : false,
  });

  // WebSocket auto-refresh
  useEffect(() => {
    alertsWs.connect();
    const unsubscribe = alertsWs.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      const currentId = selectedAlertIdRef.current;
      if (currentId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.alerts.auditTrail(currentId) });
      }
    });
    return () => {
      unsubscribe();
      alertsWs.disconnect();
    };
  }, [queryClient]);

  // Filter to Tier 2 only
  const tier2Alerts = allAlerts.filter((a) => a.tier === 'TIER_2');

  const filteredAlerts = tier2Alerts.filter((alert) => {
    if (eventFilter === 'all') return true;
    return alert.eventType === eventFilter;
  });

  const handleResolve = async (id: string) => {
    setIsResolving(true);
    try {
      await alertsApi.resolveAlert(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title={t('alerts:operational.title')} />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text={t('alerts:operational.loading')} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={t('alerts:operational.title')}
        subtitle={t('alerts:operational.subtitle', {
          count: tier2Alerts.filter((a) => a.status === 'ACTIVE').length,
        })}
      />

      <div className="p-6 space-y-6">
        {/* Event Type Filters */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={18} />
              <span className="font-medium">{t('alerts:operational.eventTypeLabel')}:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {EVENT_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEventFilter(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    eventFilter === opt.value
                      ? 'bg-amber-500 text-white'
                      : 'bg-dashboard-bg text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                  {opt.value === 'all'
                    ? ` (${tier2Alerts.length})`
                    : ` (${tier2Alerts.filter((a) => a.eventType === opt.value).length})`}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Alerts List */}
        <Card>
          <AlertList
            alerts={filteredAlerts}
            onAlertClick={setSelectedAlert}
            emptyMessage={t('alerts:operational.empty')}
          />
        </Card>
      </div>

      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolve={handleResolve}
          auditTrail={selectedAlertAudit}
          isResolving={isResolving}
        />
      )}
    </>
  );
};

export default OperationalAlerts;
