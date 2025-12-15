import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { Header, Card, LoadingSpinner } from '../components/common';
import { AlertList, AlertDetail } from '../components/alerts';
import { alertsApi } from '../services/api';
import type { Alert } from '../types';

const Alerts: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const data = await alertsApi.getAllAlerts();
                setAlerts(data);
            } catch (error) {
                console.error('Error fetching alerts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAlerts();
    }, []);

    const handleResolve = async (id: string) => {
        setIsResolving(true);
        try {
            const resolved = await alertsApi.resolveAlert(id);
            setAlerts((prev) =>
                prev.map((a) => (a.id === id ? resolved : a))
            );
            setSelectedAlert(null);
        } catch (error) {
            console.error('Error resolving alert:', error);
        } finally {
            setIsResolving(false);
        }
    };

    const filteredAlerts = alerts.filter((alert) => {
        if (filter === 'active') return alert.status === 'ACTIVE';
        if (filter === 'resolved') return alert.status === 'RESOLVED';
        return true;
    });

    const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;
    const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

    if (isLoading) {
        return (
            <>
                <Header title="Alerts" />
                <div className="flex items-center justify-center h-96">
                    <LoadingSpinner size="lg" text="Loading alerts..." />
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Alerts Management" subtitle={`${activeCount} active alert${activeCount !== 1 ? 's' : ''}`} />

            <div className="p-6 space-y-6">
                {/* Filters */}
                <Card>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Filter size={18} />
                            <span className="font-medium">Filter:</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'all'
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-dashboard-bg text-slate-400 hover:text-white'
                                    }`}
                            >
                                All ({alerts.length})
                            </button>
                            <button
                                onClick={() => setFilter('active')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'active'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-dashboard-bg text-slate-400 hover:text-white'
                                    }`}
                            >
                                Active ({activeCount})
                            </button>
                            <button
                                onClick={() => setFilter('resolved')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'resolved'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-dashboard-bg text-slate-400 hover:text-white'
                                    }`}
                            >
                                Resolved ({resolvedCount})
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Alerts List */}
                <Card>
                    <AlertList
                        alerts={filteredAlerts}
                        onAlertClick={(alert) => setSelectedAlert(alert)}
                        emptyMessage={`No ${filter === 'all' ? '' : filter + ' '}alerts found`}
                    />
                </Card>
            </div>

            {/* Alert Detail Modal */}
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

export default Alerts;
