import React from 'react';
import type { Route, LiveLocation } from '../../types';
import RouteCard from './RouteCard';

interface RouteListProps {
    routes: Route[];
    liveLocations?: LiveLocation[];
    onRouteClick?: (route: Route) => void;
    emptyMessage?: string;
}

const RouteList: React.FC<RouteListProps> = ({
    routes,
    liveLocations = [],
    onRouteClick,
    emptyMessage = 'No routes',
}) => {
    if (routes.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    const getLocationForRoute = (routeId: string) =>
        liveLocations.find((l) => l.routeId === routeId);

    return (
        <div className="space-y-3">
            {routes.map((route) => (
                <RouteCard
                    key={route.id}
                    route={route}
                    liveLocation={getLocationForRoute(route.id)}
                    onClick={() => onRouteClick?.(route)}
                />
            ))}
        </div>
    );
};

export default RouteList;
