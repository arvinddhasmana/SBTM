import React from 'react';
import type { Route, LiveLocation } from '../../types';
import RouteCardCompact from './RouteCardCompact';

interface RouteListCompactProps {
  routes: Route[];
  liveLocations?: LiveLocation[];
  onRouteClick?: (route: Route) => void;
  emptyMessage?: string;
}

const RouteListCompact: React.FC<RouteListCompactProps> = ({
  routes,
  liveLocations = [],
  onRouteClick,
  emptyMessage = 'No active routes',
}) => {
  if (routes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const getLocationForRoute = (routeId: string) => liveLocations.find((l) => l.routeId === routeId);

  return (
    <div className="space-y-2">
      {routes.map((route) => (
        <RouteCardCompact
          key={route.id}
          route={route}
          liveLocation={getLocationForRoute(route.id)}
          onClick={() => onRouteClick?.(route)}
        />
      ))}
    </div>
  );
};

export default RouteListCompact;
