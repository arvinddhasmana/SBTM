import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { Header, Card, LoadingSpinner } from '../components/common';
import { AlertList, AlertDetail } from '../components/alerts';
import { alertsApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import type { Alert, AlertEventType } from '../types';

type EventFilter = 'all' | AlertEventType;

const EVENT_FILTER_OPTIONS: { value: EventFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'LATE_ARRIVAL', label: 'Late Arrival' },
  { value: 'LATE_DEPARTURE', label: 'Late Departure' },
  { value: 'ROUTE_DEVIATION', label: 'Route Deviation' },
  { value: 'ROUTE_DIVERSION', label: 'Route Diversion' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'OTHER', label: 'Other' },
];

const OperationalAlerts: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [isResolving, setIsResolving] = useState(false);

  const { data: allAlerts = [], isLoading } = useQuery({
    queryKey: queryKeys.alerts.all,
    queryFn: () => alertsApi.getAllAlerts(),
  });

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
        <Header title="Operational Alerts" />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text="Loading operational alerts..." />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Operational Alerts"
        subtitle={`${tier2Alerts.filter((a) => a.status === 'ACTIVE').length} active Tier 2 alerts`}
      />

      <div className="p-6 space-y-6">
        {/* Event Type Filters */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={18} />
              <span className="font-medium">Event Type:</span>
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
            emptyMessage="No operational alerts found"
          />
        </Card>
      </div>

      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolve={handleResolve}
          isResolving={isResolving}
        />
      )}
    </>
  );
};

export default OperationalAlerts;
