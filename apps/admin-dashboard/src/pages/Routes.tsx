import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Header, Card, LoadingSpinner } from '../components/common';
import { RouteList } from '../components/routes';
import { LiveMap } from '../components/map';
import { routesApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import type { Route } from '../types';

const Routes: React.FC = () => {
  const { t } = useTranslation(['routes', 'common']);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.routes.all, 'with-locations'],
    queryFn: async () => {
      const [routesData, locationsData] = await Promise.all([
        routesApi.getAllRoutes(),
        routesApi.getAllLiveLocations(),
      ]);
      return { routes: routesData, locations: locationsData };
    },
    refetchInterval: 10_000,
  });

  const routes = data?.routes ?? [];
  const locations = data?.locations ?? [];

  useEffect(() => {
    if (!selectedRoute || selectedRoute.path) return;
    let cancelled = false;
    routesApi
      .getRouteShape(selectedRoute.id)
      .then((shape) => {
        if (cancelled || shape.length === 0) return;
        const path: [number, number][] = [...shape]
          .sort((a, b) => a.sequence - b.sequence)
          .map((p) => [p.lat, p.lon]);
        setSelectedRoute((prev) =>
          prev && prev.id === selectedRoute.id ? { ...prev, path } : prev,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedRoute]);

  const selectedLocation = selectedRoute
    ? locations.find((l) => l.routeId === selectedRoute.id)
    : null;

  if (isLoading) {
    return (
      <>
        <Header title={t('routes:title')} />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text={t('routes:loading')} />
        </div>
      </>
    );
  }

  const activeCount = routes.filter((r) => r.status === 'active').length;

  return (
    <>
      <Header
        title={t('routes:monitoring')}
        subtitle={t('routes:activeRoutesCount', { count: activeCount })}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Routes List */}
          <Card
            title={t('routes:allRoutes')}
            className="lg:col-span-1 max-h-[calc(100vh-200px)] overflow-y-auto"
          >
            <RouteList
              routes={routes}
              liveLocations={locations}
              onRouteClick={setSelectedRoute}
              emptyMessage={t('routes:noRoutesAvailable')}
            />
          </Card>

          {/* Map */}
          <Card
            title={
              selectedRoute
                ? t('routes:routeLabel', { name: selectedRoute.name })
                : t('routes:fleetMap')
            }
            className="lg:col-span-2"
          >
            <div className="h-[500px]">
              <LiveMap
                locations={selectedLocation ? [selectedLocation] : locations}
                selectedRoute={selectedRoute ?? undefined}
                onReset={() => setSelectedRoute(null)}
                onMarkerClick={(loc) => {
                  const route = routes.find((r) => r.id === loc.routeId);
                  if (route) setSelectedRoute(route);
                }}
              />
            </div>
            {selectedRoute && (
              <div className="mt-4 pt-4 border-t border-dashboard-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">{selectedRoute.name}</h4>
                    <p className="text-sm text-slate-400">
                      {selectedRoute.direction} •{' '}
                      {t('routes:stopsCount', { count: selectedRoute.stops.length })}
                    </p>
                  </div>
                  <button onClick={() => setSelectedRoute(null)} className="btn-secondary text-sm">
                    {t('routes:clearSelection')}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default Routes;
