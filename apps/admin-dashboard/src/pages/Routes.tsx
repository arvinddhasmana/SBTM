import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header, Card, LoadingSpinner } from '../components/common';
import { RouteList } from '../components/routes';
import { LiveMap } from '../components/map';
import { routesApi } from '../services/api';
import { queryKeys } from '../services/query-keys';
import { decodePolyline } from '../utils/polyline';
import type { Route, LiveLocation } from '../types';

const Routes: React.FC = () => {
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

  const selectedLocation = selectedRoute
    ? locations.find((l) => l.routeId === selectedRoute.id)
    : null;

  if (isLoading) {
    return (
      <>
        <Header title="Routes" />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" text="Loading routes..." />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Route Monitoring"
        subtitle={`${routes.filter((r) => r.status === 'active').length} active routes`}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Routes List */}
          <Card
            title="All Routes"
            className="lg:col-span-1 max-h-[calc(100vh-200px)] overflow-y-auto"
          >
            <RouteList
              routes={routes}
              liveLocations={locations}
              onRouteClick={setSelectedRoute}
              emptyMessage="No routes available"
            />
          </Card>

          {/* Map */}
          <Card
            title={selectedRoute ? `Route: ${selectedRoute.name}` : 'Fleet Map'}
            className="lg:col-span-2"
          >
            <div className="h-[500px]">
              <LiveMap
                locations={selectedLocation ? [selectedLocation] : locations}
                plannedRoute={
                  selectedRoute?.polyline ? decodePolyline(selectedRoute.polyline) : undefined
                }
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
                      {selectedRoute.direction} • {selectedRoute.stops.length} stops
                    </p>
                  </div>
                  <button onClick={() => setSelectedRoute(null)} className="btn-secondary text-sm">
                    Clear Selection
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
