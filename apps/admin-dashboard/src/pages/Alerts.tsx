import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header, Card, LoadingSpinner } from '../components/common';
import { AlertList, AlertDetail, AlertConfirmationModal } from '../components/alerts';
import { alertsApi, routesApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import { useAuth } from '../context/AuthContext';
import { alertsWs } from '../services/websocket/alerts.ws';
import type { Alert, AlertAuditEntry } from '../types';

type FilterOption = 'all' | 'active' | 'pending' | 'confirmed' | 'resolved';
type TierFilter = 'all' | 'TIER_1' | 'TIER_2' | 'TIER_3';

const Alerts: React.FC = () => {
  const { t } = useTranslation(['alerts', 'common']);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [confirmationAlert, setConfirmationAlert] = useState<Alert | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [isResolving, setIsResolving] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [expandedTimelineAlertId, setExpandedTimelineAlertId] = useState<string | null>(null);

  const TIER_TABS: { value: TierFilter; label: string; color: string }[] = [
    { value: 'all', label: t('alerts:tierTabs.allTiers'), color: 'bg-primary-500' },
    { value: 'TIER_1', label: t('alerts:tierTabs.tier1'), color: 'bg-red-500' },
    { value: 'TIER_2', label: t('alerts:tierTabs.tier2'), color: 'bg-amber-500' },
    { value: 'TIER_3', label: t('alerts:tierTabs.tier3'), color: 'bg-blue-500' },
  ];

  // Keep a ref to selectedAlert.id for WebSocket callback
  const selectedAlertIdRef = useRef<string | null>(null);
  selectedAlertIdRef.current = selectedAlert?.id ?? null;

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: queryKeys.alerts.all,
    queryFn: () => alertsApi.getAllAlerts(),
  });

  const { data: routes = [] } = useQuery({
    queryKey: queryKeys.routes.all,
    queryFn: () => routesApi.getAllRoutes(),
    staleTime: 60_000,
  });

  // Audit trail for selected alert detail panel (with auto-refresh polling)
  const { data: selectedAlertAudit = [] } = useQuery({
    queryKey: queryKeys.alerts.auditTrail(selectedAlert?.id ?? ''),
    queryFn: () => alertsApi.getAlertAuditLog(selectedAlert!.id),
    enabled: !!selectedAlert,
    refetchInterval: selectedAlert ? 10_000 : false,
  });

  // Audit trail for expanded inline timeline in alert list
  const { data: expandedTimelineAudit = [] } = useQuery({
    queryKey: queryKeys.alerts.auditTrail(expandedTimelineAlertId ?? ''),
    queryFn: () => alertsApi.getAlertAuditLog(expandedTimelineAlertId!),
    enabled: !!expandedTimelineAlertId,
  });

  // WebSocket: connect on mount, invalidate queries on alert updates
  useEffect(() => {
    alertsWs.connect();
    const unsubscribe = alertsWs.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      // Also refresh the audit trail for the currently selected alert
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

  const routeNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const r of routes) map[r.id] = r.name;
    return map;
  }, [routes]);

  // Auto-surface the first PENDING_CONFIRMATION alert for admins who can act on it.
  const pendingAlerts = alerts.filter((a) => a.status === 'PENDING_CONFIRMATION');
  const canConfirm =
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'BOARD_ADMIN' ||
    user?.role === 'OSTA_ADMIN' ||
    user?.role === 'ADMIN';

  const handleResolve = async (id: string, notes?: string) => {
    setIsResolving(true);
    try {
      await alertsApi.resolveAlert(id, notes, user?.id, user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    setIsActing(true);
    try {
      await alertsApi.confirmAlert(id, user?.id, user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      setConfirmationAlert(null);
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error confirming alert:', error);
    } finally {
      setIsActing(false);
    }
  };

  const handleFalseAlarm = async (id: string) => {
    setIsActing(true);
    try {
      await alertsApi.falseAlarmAlert(id, undefined, user?.id, user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      setConfirmationAlert(null);
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error marking false alarm:', error);
    } finally {
      setIsActing(false);
    }
  };

  const handleRequestInfo = async (id: string) => {
    setIsActing(true);
    try {
      await alertsApi.requestInfoAlert(id, user?.id, user?.role);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    } catch (error) {
      console.error('Error requesting info:', error);
    } finally {
      setIsActing(false);
    }
  };

  const handleAddStatusUpdate = async (id: string, notes: string) => {
    await alertsApi.addStatusUpdate(id, notes, user?.id, user?.role);
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.auditTrail(id) });
  };

  const handleAlertClick = (alert: Alert) => {
    // All alerts open in the floating AlertDetail panel (including PENDING_CONFIRMATION)
    setSelectedAlert(alert);
  };

  const handleToggleTimeline = (alertId: string) => {
    setExpandedTimelineAlertId((prev) => (prev === alertId ? null : alertId));
  };

  const filteredAlerts = alerts.filter((alert) => {
    // Tier filter
    if (tierFilter !== 'all' && alert.tier !== tierFilter) return false;
    // Status filter
    if (filter === 'active') return alert.status === 'ACTIVE';
    if (filter === 'resolved') return alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM';
    if (filter === 'pending') return alert.status === 'PENDING_CONFIRMATION';
    if (filter === 'confirmed')
      return alert.status === 'CONFIRMED' || alert.status === 'AUTO_ESCALATED';
    return true;
  });

  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const resolvedCount = alerts.filter(
    (a) => a.status === 'RESOLVED' || a.status === 'FALSE_ALARM',
  ).length;
  const pendingCount = pendingAlerts.length;
  const confirmedCount = alerts.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'AUTO_ESCALATED',
  ).length;

  if (isLoading) {
    return (
      <>
        <Header title={t('alerts:title')} />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text={t('alerts:loading')} />
        </div>
      </>
    );
  }

  // Build subtitle dynamically with translations
  const subtitleParts = [t('alerts:activeCount', { count: activeCount })];
  if (pendingCount > 0) {
    subtitleParts.push(t('alerts:awaitingConfirmation', { count: pendingCount }));
  }
  if (confirmedCount > 0) {
    subtitleParts.push(t('alerts:inProgressCount', { count: confirmedCount }));
  }
  const subtitle = subtitleParts.join(' · ');

  return (
    <>
      <Header title={t('alerts:management')} subtitle={subtitle} />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={18} />
              <span className="font-medium">{t('alerts:filter')}:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dashboard-bg text-slate-400 hover:text-white'
                }`}
              >
                {t('alerts:filterButtons.all', { count: alerts.length })}
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === 'active'
                    ? 'bg-red-500 text-white'
                    : 'bg-dashboard-bg text-slate-400 hover:text-white'
                }`}
              >
                {t('alerts:filterButtons.active', { count: activeCount })}
              </button>
              {canConfirm && (
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filter === 'pending'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-dashboard-bg text-slate-400 hover:text-white'
                  }`}
                >
                  {t('alerts:filterButtons.pending', { count: pendingCount })}
                  {pendingCount > 0 && (
                    <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  )}
                </button>
              )}
              <button
                onClick={() => setFilter('confirmed')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === 'confirmed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-dashboard-bg text-slate-400 hover:text-white'
                }`}
              >
                {t('alerts:filterButtons.confirmed', { count: confirmedCount })}
              </button>
              <button
                onClick={() => setFilter('resolved')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === 'resolved'
                    ? 'bg-green-500 text-white'
                    : 'bg-dashboard-bg text-slate-400 hover:text-white'
                }`}
              >
                {t('alerts:filterButtons.resolved', { count: resolvedCount })}
              </button>
            </div>
          </div>
        </Card>

        {/* Tier Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TIER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTierFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tierFilter === tab.value
                  ? `${tab.color} text-white`
                  : 'bg-dashboard-card text-slate-400 hover:text-white border border-dashboard-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <Card>
          <AlertList
            alerts={filteredAlerts}
            onAlertClick={handleAlertClick}
            compact={false}
            routeNames={routeNames}
            emptyMessage={
              filter === 'all' ? t('alerts:empty') : t('alerts:emptyFiltered', { filter })
            }
            expandedTimelineAlertId={expandedTimelineAlertId}
            expandedTimelineAudit={expandedTimelineAudit}
            onToggleTimeline={handleToggleTimeline}
          />
        </Card>
      </div>

      {/* Tier 1 Confirmation Modal — shown when admin clicks a pending alert */}
      {confirmationAlert && canConfirm && (
        <AlertConfirmationModal
          alert={confirmationAlert}
          onConfirm={handleConfirm}
          onFalseAlarm={handleFalseAlarm}
          onRequestInfo={handleRequestInfo}
          onClose={() => setConfirmationAlert(null)}
          routeName={routeNames[confirmationAlert.routeId]}
        />
      )}

      {/* Alert Detail — floating overlay panel */}
      {selectedAlert && (
        <AlertDetail
          variant="overlay"
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolve={handleResolve}
          onConfirm={canConfirm ? handleConfirm : undefined}
          onFalseAlarm={canConfirm ? handleFalseAlarm : undefined}
          onRequestInfo={canConfirm ? handleRequestInfo : undefined}
          onAddStatusUpdate={canConfirm ? handleAddStatusUpdate : undefined}
          auditTrail={selectedAlertAudit}
          isResolving={isResolving}
          isActing={isActing}
          routeName={routeNames[selectedAlert.routeId]}
        />
      )}
    </>
  );
};

export default Alerts;
