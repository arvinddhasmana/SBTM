import React, { useState, useEffect, useCallback } from 'react';
import { Filter, RefreshCw, Layers, MapPin } from 'lucide-react';
import { Header, Card, LoadingSpinner, ResizablePanel } from '../components/common';
import { RouteList, RouteDetail } from '../components/routes';
import { LiveMap } from '../components/map';
import { routesApi } from '../services/api';
import type { Route, LiveLocation } from '../types';

type StatusFilter = 'all' | 'active' | 'completed' | 'scheduled';

const Routes: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [locations, setLocations] = useState<LiveLocation[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [listWidth, setListWidth] = useState(320);

    const fetchData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        try {
            const [routesData, locationsData] = await Promise.all([
                routesApi.getAllRoutes(),
                routesApi.getAllLiveLocations(),
            ]);
            setRoutes(routesData);
            setLocations(locationsData);
        } catch (error) {
            console.error('Error fetching routes:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const filteredRoutes = routes.filter((r) => {
        if (statusFilter === 'all') return true;
        return r.status === statusFilter;
    });

    const activeCount = routes.filter((r) => r.status === 'active').length;
    const selectedLocation = selectedRoute
        ? locations.find((l) => l.routeId === selectedRoute.id)
        : null;

    if (isLoading) {
        return (
            <>
                <Header title="Routes" />
                <div className="flex items-center justify-center h-96">
                    <LoadingSpinner size="lg" text="Loading routes…" />
                </div>
            </>
        );
    }

    const filterButtons: { label: string; value: StatusFilter; count?: number }[] = [
        { label: 'All', value: 'all', count: routes.length },
        { label: 'Active', value: 'active', count: activeCount },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Completed', value: 'completed' },
    ];

    return (
        <>
            <Header
                title="Route Monitoring"
                subtitle={`${activeCount} active route${activeCount !== 1 ? 's' : ''}`}
                action={
                    <button
                        type="button"
                        onClick={() => fetchData(true)}
                        aria-label="Refresh routes"
                        className="btn-icon"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                }
            />

            <div className="p-5 bg-mesh min-h-[calc(100vh-64px)] space-y-4">
                {/* ── Filter Bar ───────────────────────────────────── */}
                <Card noPadding>
                    <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                            <Filter size={13} />
                            <span>Filter</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {filterButtons.map((btn) => (
                                <button
                                    key={btn.value}
                                    type="button"
                                    onClick={() => setStatusFilter(btn.value)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                                    style={
                                        statusFilter === btn.value
                                            ? {
                                                  background: 'rgba(14,165,233,0.15)',
                                                  border: '1px solid rgba(14,165,233,0.3)',
                                                  color: '#38bdf8',
                                              }
                                            : {
                                                  background: 'rgba(13,27,51,0.5)',
                                                  border: '1px solid rgba(30,58,95,0.4)',
                                                  color: 'rgba(148,163,184,0.7)',
                                              }
                                    }
                                >
                                    {btn.label}
                                    {btn.count !== undefined && (
                                        <span className="ml-1.5 opacity-70">({btn.count})</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                            <Layers size={12} />
                            <span>{filteredRoutes.length} routes shown</span>
                        </div>
                    </div>
                </Card>

                {/* ── Main Layout: List | Detail | Map ─────────────── */}
                <div className="flex gap-0 overflow-hidden rounded-2xl" style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>

                    {/* Left Panel: Route List — resizable */}
                    <ResizablePanel
                        initialWidth={listWidth}
                        minWidth={220}
                        maxWidth={480}
                        handleSide="right"
                        onResize={setListWidth}
                        className="flex flex-col"
                    >
                        <div
                            className="h-full flex flex-col rounded-l-2xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, rgba(13,27,51,0.95) 0%, rgba(6,13,31,0.97) 100%)',
                                borderTop: '1px solid rgba(30,58,95,0.5)',
                                borderBottom: '1px solid rgba(30,58,95,0.5)',
                                borderLeft: '1px solid rgba(30,58,95,0.5)',
                                borderRight: '1px solid rgba(30,58,95,0.25)',
                            }}
                        >
                            <div
                                className="px-4 py-3 flex-shrink-0 flex items-center justify-between"
                                style={{ borderBottom: '1px solid rgba(30,58,95,0.4)' }}
                            >
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    All Routes
                                </p>
                                <span className="badge badge-primary text-xs">
                                    {filteredRoutes.length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                                <RouteList
                                    routes={filteredRoutes}
                                    liveLocations={locations}
                                    onRouteClick={setSelectedRoute}
                                    emptyMessage="No routes match the current filter"
                                />
                            </div>
                        </div>
                    </ResizablePanel>

                    {/* Middle Panel: Route Detail (shown when a route is selected) */}
                    {selectedRoute && (
                        <div
                            className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
                            style={{
                                borderTop: '1px solid rgba(30,58,95,0.5)',
                                borderBottom: '1px solid rgba(30,58,95,0.5)',
                                borderRight: '1px solid rgba(30,58,95,0.25)',
                            }}
                        >
                            <RouteDetail
                                route={selectedRoute}
                                liveLocation={selectedLocation ?? undefined}
                                onClose={() => setSelectedRoute(null)}
                            />
                        </div>
                    )}

                    {/* Right Panel: Map — flex-grows to fill remaining space */}
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-r-2xl"
                        style={{
                            background: 'rgba(6,13,31,0.8)',
                            border: '1px solid rgba(30,58,95,0.5)',
                        }}
                    >
                        {/* Map header */}
                        <div
                            className="px-4 py-3 flex-shrink-0 flex items-center justify-between"
                            style={{ borderBottom: '1px solid rgba(30,58,95,0.4)' }}
                        >
                            <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-primary-400" />
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {selectedRoute ? `Route: ${selectedRoute.name}` : 'Fleet Map'}
                                </p>
                            </div>
                            {selectedRoute && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedRoute(null)}
                                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    Show all
                                </button>
                            )}
                        </div>

                        {/* Map body */}
                        <div className="flex-1 p-3 min-h-0">
                            <LiveMap
                                locations={selectedLocation ? [selectedLocation] : locations}
                                onMarkerClick={(loc) => {
                                    const route = routes.find((r) => r.id === loc.routeId);
                                    if (route) setSelectedRoute(route);
                                }}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Routes;

