import React from 'react';
import type { LiveLocation, Route } from '../../types';
import BusCard from './BusCard';

interface BusListProps {
  locations: LiveLocation[];
  routes: Route[];
  onBusClick?: (location: LiveLocation) => void;
  emptyMessage?: string;
}

const BusList: React.FC<BusListProps> = ({
  locations,
  routes,
  onBusClick,
  emptyMessage = 'No buses on route',
}) => {
  if (locations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const routeMap = new Map(routes.map((r) => [r.id, r]));

  return (
    <div className="space-y-2">
      {locations.map((loc) => (
        <BusCard
          key={`${loc.vehicleId}-${loc.routeId}`}
          location={loc}
          route={routeMap.get(loc.routeId)}
          onClick={() => onBusClick?.(loc)}
        />
      ))}
    </div>
  );
};

export default BusList;
